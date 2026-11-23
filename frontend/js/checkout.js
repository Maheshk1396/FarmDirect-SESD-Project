// frontend/js/checkout.js
/**
 * FarmDirect Checkout & Razorpay Integration
 */

const checkout = {
  cartData: null,
  selectedPaymentMethod: 'RAZORPAY',

  async init() {
    // Auth check
    if (!auth.requireAuth()) return;

    await this.loadCart();
    await this.loadSavedAddresses();
    this.bindEvents();
  },

  async loadCart() {
    try {
      const res = await api.get('/cart');
      this.cartData = res.data;

      if (!this.cartData || !this.cartData.items || this.cartData.items.length === 0) {
        window.location.href = '/cart.html';
        return;
      }

      this.renderOrderSummary();
    } catch (e) {
      toast.error('Failed to load checkout summary');
    }
  },

  async loadSavedAddresses() {
    try {
      const res = await api.get('/profile');
      const addresses = res.data.addresses || [];
      const container = document.getElementById('saved-addresses-list');

      if (container && addresses.length > 0) {
        container.innerHTML = `
          <div style="font-weight:700;margin-bottom:0.75rem;font-size:0.95rem;">Select Saved Address:</div>
          <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem;">
            ${addresses.map((addr, idx) => `
              <label class="card" style="padding:1rem;cursor:pointer;display:flex;align-items:flex-start;gap:0.75rem;border-color:${addr.isDefault ? 'var(--primary-color)' : 'var(--border-color)'};">
                <input type="radio" name="selectedSavedAddr" value="${addr.id}" ${idx === 0 ? 'checked' : ''} style="margin-top:0.25rem;">
                <div>
                  <div style="font-weight:700;">${addr.fullName} <span style="font-weight:normal;color:var(--text-muted);font-size:0.85rem;">(${addr.phone})</span></div>
                  <div style="font-size:0.85rem;color:var(--text-muted);">${addr.houseNumber} ${addr.street}, ${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pinCode}</div>
                </div>
              </label>
            `).join('')}
          </div>
        `;

        // Pre-fill form from first address
        this.fillAddressForm(addresses[0]);

        // Listen for address changes
        container.querySelectorAll('input[name="selectedSavedAddr"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            const addr = addresses.find(a => a.id === e.target.value);
            if (addr) this.fillAddressForm(addr);
          });
        });
      }
    } catch (e) {
      console.warn('Saved addresses note:', e);
    }
  },

  fillAddressForm(addr) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    setVal('addr-name', addr.fullName);
    setVal('addr-phone', addr.phone);
    setVal('addr-house', addr.houseNumber);
    setVal('addr-street', addr.street);
    setVal('addr-landmark', addr.landmark);
    setVal('addr-city', addr.city);
    setVal('addr-district', addr.district);
    setVal('addr-state', addr.state);
    setVal('addr-pincode', addr.pinCode);
  },

  renderOrderSummary() {
    const listEl = document.getElementById('checkout-items-list');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const deliveryEl = document.getElementById('checkout-delivery');
    const grandTotalEl = document.getElementById('checkout-grand-total');

    if (listEl) {
      listEl.innerHTML = this.cartData.items.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border-light);font-size:0.9rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <img src="${item.imageUrl}" alt="${item.name}" style="width:40px;height:40px;border-radius:var(--radius-sm);object-fit:cover;">
            <div>
              <div style="font-weight:600;color:var(--text-dark);">${item.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${item.quantity} ${item.unit} × ₹${item.price}</div>
            </div>
          </div>
          <div style="font-weight:700;">₹${item.itemTotal.toFixed(2)}</div>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = `₹${this.cartData.subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.textContent = this.cartData.deliveryCharge === 0 ? 'FREE' : `₹${this.cartData.deliveryCharge.toFixed(2)}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${this.cartData.grandTotal.toFixed(2)}`;
  },

  bindEvents() {
    // Payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedPaymentMethod = e.target.value;
      });
    });

    // Form submit
    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.processOrder();
      });
    }
  },

  async processOrder() {
    const btn = document.getElementById('place-order-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Secure Checkout...';
    }

    try {
      // Gather address
      const address = {
        fullName: document.getElementById('addr-name')?.value.trim(),
        phone: document.getElementById('addr-phone')?.value.trim(),
        houseNumber: document.getElementById('addr-house')?.value.trim(),
        street: document.getElementById('addr-street')?.value.trim(),
        landmark: document.getElementById('addr-landmark')?.value.trim(),
        city: document.getElementById('addr-city')?.value.trim(),
        district: document.getElementById('addr-district')?.value.trim() || document.getElementById('addr-city')?.value.trim(),
        state: document.getElementById('addr-state')?.value.trim(),
        pinCode: document.getElementById('addr-pincode')?.value.trim(),
      };

      if (!address.fullName || !address.phone || !address.street || !address.city || !address.pinCode) {
        throw new Error('Please fill in all mandatory delivery address fields.');
      }

      // Step 1: Create Order on Backend
      const orderRes = await api.post('/orders', {
        address,
        paymentMethod: this.selectedPaymentMethod,
        notes: document.getElementById('delivery-notes')?.value.trim() || '',
      });

      const order = orderRes.data;

      // Step 2: Handle Payment Flow
      if (this.selectedPaymentMethod === 'COD') {
        toast.success('Cash on Delivery Order Placed Successfully!');
        window.location.href = `/payment-success.html?orderId=${order.id}&method=COD`;
        return;
      }

      // Online Payment via Razorpay
      const paymentOrderRes = await api.post('/payments/create-order', {
        orderId: order.id,
      });

      const paymentData = paymentOrderRes.data;

      // Check if Razorpay JS SDK is loaded
      if (typeof Razorpay !== 'undefined') {
        const options = {
          key: paymentData.keyId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          name: 'FarmDirect India',
          description: `Order #${order.orderNumber} Payment`,
          order_id: paymentData.razorpayOrderId,
          handler: async (response) => {
            try {
              // Step 3: Backend signature verification
              const verifyRes = await api.post('/payments/verify', {
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.success('Payment verified successfully!');
              window.location.href = `/payment-success.html?orderId=${order.id}&method=RAZORPAY`;
            } catch (vErr) {
              toast.error(vErr.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: address.fullName,
            contact: address.phone,
            email: auth.getUser()?.email,
          },
          theme: {
            color: '#166534',
          },
          modal: {
            ondismiss: () => {
              toast.warning('Payment was cancelled. You can retry anytime from your orders.');
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-lock"></i> Proceed to Pay';
              }
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } else {
        // Fallback for development sandbox testing
        toast.info('Simulating Test Sandbox Payment...');
        setTimeout(async () => {
          await api.post('/payments/verify', {
            orderId: order.id,
            razorpayOrderId: paymentData.razorpayOrderId,
            razorpayPaymentId: `pay_test_${Date.now()}`,
            razorpaySignature: 'MOCK_VERIFIED',
          });
          window.location.href = `/payment-success.html?orderId=${order.id}&method=ONLINE`;
        }, 1200);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> Place Order Now';
      }
    }
  }
};

window.checkout = checkout;
