// frontend/js/cart.js
/**
 * FarmDirect Shopping Cart Operations
 */

const cart = {
  data: null,

  async load() {
    try {
      const res = await api.get('/cart');
      this.data = res.data;
      this.render();
      window.updateBadges?.();
      return this.data;
    } catch (err) {
      toast.error('Failed to load cart');
    }
  },

  async add(productId, quantity = 1) {
    try {
      const res = await api.post('/cart/items', { productId, quantity });
      this.data = res.data;
      toast.success(res.message || 'Added to cart');
      window.updateBadges?.();
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Could not add product to cart');
    }
  },

  async updateQuantity(productId, quantity) {
    try {
      const res = await api.put(`/cart/items/${productId}`, { quantity });
      this.data = res.data;
      this.render();
      window.updateBadges?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update quantity');
    }
  },

  async remove(productId) {
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      this.data = res.data;
      this.render();
      window.updateBadges?.();
      toast.info('Item removed from cart');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  },

  render() {
    const container = document.getElementById('cart-items-container');
    const emptyState = document.getElementById('cart-empty-state');
    const summaryCard = document.getElementById('cart-summary-card');

    if (!container || !this.data) return;

    if (!this.data.items || this.data.items.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (summaryCard) summaryCard.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (summaryCard) summaryCard.style.display = 'block';

    // Render grouped by farmer
    let html = '';
    for (const group of this.data.farmerBreakdown) {
      html += `
        <div class="card" style="margin-bottom:1.5rem;overflow:hidden;">
          <div style="background:#f0fdf4;padding:0.85rem 1.25rem;border-bottom:1px solid #bbf7d0;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;color:var(--primary-color);">
              <i class="fa-solid fa-tractor"></i>
              <span>${group.farmName}</span>
              ${group.district ? `<span class="badge badge-neutral" style="font-size:0.75rem;">${group.district}</span>` : ''}
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);">
              Subtotal: <strong style="color:var(--text-dark);">₹${group.farmerSubtotal.toFixed(2)}</strong>
            </div>
          </div>
          <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:1rem;">
            ${group.items.map(item => `
              <div style="display:flex;align-items:center;gap:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border-light);">
                <img src="${item.imageUrl}" alt="${item.name}" style="width:72px;height:72px;border-radius:var(--radius-md);object-fit:cover;">
                <div style="flex:1;">
                  <a href="/product-details.html?id=${item.productId}" style="font-weight:700;color:var(--text-dark);font-size:1rem;display:block;margin-bottom:0.25rem;">
                    ${item.name}
                  </a>
                  <div style="font-size:0.85rem;color:var(--text-muted);">
                    ₹${item.price} / ${item.unit}
                  </div>
                </div>
                <div style="display:flex;align-items:center;border:1px solid var(--border-color);border-radius:var(--radius-md);overflow:hidden;background:#fff;">
                  <button style="padding:0.4rem 0.75rem;border:none;background:none;cursor:pointer;font-weight:bold;" onclick="cart.updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                  <span style="padding:0.4rem 0.85rem;font-weight:700;font-size:0.9rem;">${item.quantity}</span>
                  <button style="padding:0.4rem 0.75rem;border:none;background:none;cursor:pointer;font-weight:bold;" onclick="cart.updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                </div>
                <div style="min-width:90px;text-align:right;font-weight:800;font-size:1.1rem;color:var(--primary-color);">
                  ₹${item.itemTotal.toFixed(2)}
                </div>
                <button onclick="cart.remove('${item.productId}')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.1rem;transition:var(--transition);" title="Remove">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

    // Render Summary Card
    const subtotalEl = document.getElementById('summary-subtotal');
    const deliveryEl = document.getElementById('summary-delivery');
    const grandTotalEl = document.getElementById('summary-grand-total');

    if (subtotalEl) subtotalEl.textContent = `₹${this.data.subtotal.toFixed(2)}`;
    if (deliveryEl) {
      deliveryEl.textContent = this.data.deliveryCharge === 0 ? 'FREE' : `₹${this.data.deliveryCharge.toFixed(2)}`;
      if (this.data.deliveryCharge === 0) deliveryEl.style.color = 'var(--secondary-color)';
    }
    if (grandTotalEl) grandTotalEl.textContent = `₹${this.data.grandTotal.toFixed(2)}`;
  }
};

window.cart = cart;
