// frontend/js/dashboard.js
/**
 * FarmDirect Farmer Dashboard Controller
 * Chart.js Analytics, Sales Overview, Incoming Orders & Inventory
 */

const dashboard = {
  data: null,
  revenueChart: null,
  ordersChart: null,

  async init() {
    // Verify Farmer Role
    if (!auth.requireAuth('FARMER')) return;

    this.renderFarmerHeader();
    await this.loadStats();
    await this.loadOrders();
  },

  renderFarmerHeader() {
    const user = auth.getUser();
    const farmNameEl = document.getElementById('dash-farm-name');
    const farmerNameEl = document.getElementById('dash-farmer-name');
    const badgeEl = document.getElementById('dash-verified-badge');

    if (farmNameEl && user.farmerProfile) farmNameEl.textContent = user.farmerProfile.farmName;
    if (farmerNameEl) farmerNameEl.textContent = user.name || 'Farmer';
    if (badgeEl && user.farmerProfile) {
      const isVerified = user.farmerProfile.verificationStatus === 'VERIFIED';
      badgeEl.className = isVerified ? 'badge badge-verified' : 'badge badge-warning';
      badgeEl.innerHTML = isVerified ? '<i class="fa-solid fa-circle-check"></i> Verified Farm' : '<i class="fa-solid fa-clock"></i> Verification Pending';
    }
  },

  async loadStats() {
    try {
      const res = await api.get('/farmer/dashboard');
      this.data = res.data;

      // Populate Overview Stats
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setVal('stat-total-revenue', `₹${this.data.overview.totalRevenue.toLocaleString('en-IN')}`);
      setVal('stat-total-orders', this.data.overview.totalOrders);
      setVal('stat-pending-orders', this.data.overview.pendingOrders);
      setVal('stat-active-products', this.data.overview.activeProducts);
      setVal('stat-monthly-earnings', `₹${this.data.overview.monthlyEarnings.toLocaleString('en-IN')}`);

      this.renderCharts();
      this.renderBestSellers();
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      toast.error('Failed to load dashboard data');
    }
  },

  renderCharts() {
    if (typeof Chart === 'undefined' || !this.data) return;

    // 1. Monthly Revenue Chart (Smooth Gradient Line)
    const revCanvas = document.getElementById('revenueChartCanvas');
    if (revCanvas) {
      const ctx = revCanvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

      this.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.data.analytics.labels,
          datasets: [{
            label: 'Monthly Revenue (₹)',
            data: this.data.analytics.monthlyRevenue,
            borderColor: '#166534',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#22c55e',
            pointRadius: 5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f3f4f6' },
              ticks: {
                callback: (val) => `₹${val}`
              }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. Order Status Doughnut Chart
    const ordersCanvas = document.getElementById('ordersChartCanvas');
    if (ordersCanvas) {
      const dist = this.data.analytics.orderStatusDistribution;
      this.ordersChart = new Chart(ordersCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Placed', 'Processing', 'Shipped', 'Delivered'],
          datasets: [{
            data: [dist.placed || 1, dist.processing || 2, dist.shipped || 1, dist.delivered || 3],
            backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          cutout: '70%'
        }
      });
    }
  },

  renderBestSellers() {
    const container = document.getElementById('best-sellers-table-body');
    if (!container || !this.data.bestSellingProducts) return;

    if (this.data.bestSellingProducts.length === 0) {
      container.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No sales data recorded yet.</td></tr>';
      return;
    }

    container.innerHTML = this.data.bestSellingProducts.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <img src="${p.imageUrl}" alt="${p.name}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">
            <strong>${p.name}</strong>
          </div>
        </td>
        <td>₹${p.price} / ${p.unit}</td>
        <td><strong>${p.unitsSold}</strong> ${p.unit}s</td>
        <td style="font-weight:700;color:var(--primary-color);">₹${p.totalSalesAmount.toFixed(2)}</td>
      </tr>
    `).join('');
  },

  async loadOrders() {
    const tableBody = document.getElementById('recent-orders-table-body');
    if (!tableBody) return;

    try {
      const res = await api.get('/farmer/orders');
      const orders = res.data;

      if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No incoming orders found.</td></tr>';
        return;
      }

      tableBody.innerHTML = orders.slice(0, 8).map(ord => {
        let statusBadge = 'badge-neutral';
        if (ord.fulfillmentStatus === 'CONFIRMED') statusBadge = 'badge-info';
        if (ord.fulfillmentStatus === 'PROCESSING') statusBadge = 'badge-warning';
        if (ord.fulfillmentStatus === 'SHIPPED') statusBadge = 'badge-info';
        if (ord.fulfillmentStatus === 'DELIVERED') statusBadge = 'badge-success';

        return `
          <tr>
            <td><strong>#${ord.orderNumber}</strong></td>
            <td>${ord.customerName} (${ord.customerCity || 'India'})</td>
            <td>${ord.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}</td>
            <td><strong>₹${ord.farmerSubtotal.toFixed(2)}</strong></td>
            <td>
              <select onchange="dashboard.updateOrderStatus('${ord.id}', this.value)" style="padding:0.3rem 0.6rem;border-radius:var(--radius-sm);font-size:0.8rem;border:1px solid var(--border-color);font-weight:600;">
                <option value="PLACED" ${ord.fulfillmentStatus === 'PLACED' ? 'selected' : ''}>Placed</option>
                <option value="CONFIRMED" ${ord.fulfillmentStatus === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
                <option value="PROCESSING" ${ord.fulfillmentStatus === 'PROCESSING' ? 'selected' : ''}>Processing</option>
                <option value="READY_FOR_PICKUP" ${ord.fulfillmentStatus === 'READY_FOR_PICKUP' ? 'selected' : ''}>Ready for Pickup</option>
                <option value="SHIPPED" ${ord.fulfillmentStatus === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
                <option value="DELIVERED" ${ord.fulfillmentStatus === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
              </select>
            </td>
            <td>
              <span class="badge ${ord.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}">
                ${ord.paymentStatus}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger-color);">Failed to load incoming orders.</td></tr>';
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Fulfillment status updated to ${newStatus}`);
      await this.loadStats();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  }
};

window.dashboard = dashboard;
