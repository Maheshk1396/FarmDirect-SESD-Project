// frontend/js/products.js
/**
 * FarmDirect Products Marketplace Logic
 */

const products = {
  state: {
    search: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    organic: false,
    verifiedOnly: false,
    sortBy: 'newest',
    page: 1,
    limit: 12,
  },

  async init() {
    // Read URL query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) this.state.search = params.get('search');
    if (params.get('category')) this.state.category = params.get('category');
    if (params.get('organic')) this.state.organic = params.get('organic') === 'true';

    // Populate search box if present
    const searchInput = document.getElementById('product-filter-search');
    if (searchInput && this.state.search) {
      searchInput.value = this.state.search;
    }

    await this.loadCategories();
    await this.fetchProducts();
    this.bindEvents();
  },

  async loadCategories() {
    try {
      const res = await api.get('/categories');
      const container = document.getElementById('category-filter-list');
      if (!container) return;

      let html = `
        <label class="filter-radio-label" style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;padding:0.35rem 0;">
          <input type="radio" name="catFilter" value="all" ${this.state.category === 'all' ? 'checked' : ''}>
          <span>All Produce</span>
        </label>
      `;

      res.data.forEach(cat => {
        const isChecked = this.state.category === cat.slug || this.state.category === cat.id;
        html += `
          <label class="filter-radio-label" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:0.35rem 0;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
              <input type="radio" name="catFilter" value="${cat.slug}" ${isChecked ? 'checked' : ''}>
              <span>${cat.name}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-muted);">(${cat.productCount})</span>
          </label>
        `;
      });

      container.innerHTML = html;

      // Bind category change
      container.querySelectorAll('input[name="catFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.state.category = e.target.value;
          this.state.page = 1;
          this.fetchProducts();
        });
      });
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  },

  async fetchProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    // Show skeletons while loading
    grid.innerHTML = Array(6).fill(`
      <div class="card product-card" style="height:360px;">
        <div class="skeleton" style="height:200px;width:100%;"></div>
        <div style="padding:1.25rem;">
          <div class="skeleton" style="height:16px;width:60%;margin-bottom:0.75rem;"></div>
          <div class="skeleton" style="height:24px;width:80%;margin-bottom:1rem;"></div>
          <div class="skeleton" style="height:20px;width:40%;"></div>
        </div>
      </div>
    `).join('');

    try {
      const queryParams = {
        page: this.state.page,
        limit: this.state.limit,
        sortBy: this.state.sortBy,
      };

      if (this.state.search) queryParams.search = this.state.search;
      if (this.state.category && this.state.category !== 'all') queryParams.category = this.state.category;
      if (this.state.minPrice) queryParams.minPrice = this.state.minPrice;
      if (this.state.maxPrice) queryParams.maxPrice = this.state.maxPrice;
      if (this.state.organic) queryParams.organic = 'true';
      if (this.state.verifiedOnly) queryParams.verifiedOnly = 'true';

      const res = await api.get('/products', queryParams);
      this.renderProducts(res.data, res.meta);
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 0;color:var(--danger-color);">Failed to load products: ${err.message}</div>`;
    }
  },

  renderProducts(productList, meta) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('product-count-display');

    if (countEl && meta) {
      countEl.textContent = `Showing ${productList.length} of ${meta.total} fresh farm products`;
    }

    if (!productList || productList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;">
          <i class="fa-solid fa-seedling" style="font-size:3rem;color:var(--secondary-color);margin-bottom:1rem;"></i>
          <h3 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">No Agricultural Produce Found</h3>
          <p style="color:var(--text-muted);margin-bottom:1.5rem;">Try adjusting your search criteria, category filters, or price range.</p>
          <button class="btn btn-primary" onclick="products.resetFilters()">Reset All Filters</button>
        </div>
      `;
      this.renderPagination(meta);
      return;
    }

    grid.innerHTML = productList.map(p => {
      const primaryImg = p.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600';
      const farmer = p.farmer;

      return `
        <div class="card product-card">
          <div class="product-thumb">
            <a href="/product-details.html?id=${p.id}">
              <img src="${primaryImg}" alt="${p.name}" loading="lazy">
            </a>
            <div class="product-badges">
              ${p.isOrganic ? '<span class="badge badge-success"><i class="fa-solid fa-leaf"></i> Organic</span>' : ''}
              ${farmer?.verificationStatus === 'VERIFIED' ? '<span class="badge badge-verified"><i class="fa-solid fa-shield-check"></i> Verified Farm</span>' : ''}
            </div>
            <button class="product-wishlist-btn" onclick="products.toggleWishlist('${p.id}', this)" title="Add to Wishlist">
              <i class="fa-regular fa-heart"></i>
            </button>
          </div>
          <div class="product-body">
            <div class="product-farmer-meta">
              <i class="fa-solid fa-tractor" style="color:var(--secondary-color);"></i>
              <a href="/farmer-profile.html?id=${farmer?.id}">${farmer?.farmName || 'Local Farm'}</a>
              ${farmer?.district ? `<span>• ${farmer.district}</span>` : ''}
            </div>
            <a href="/product-details.html?id=${p.id}" class="product-title" title="${p.name}">
              ${p.name}
            </a>
            <div class="product-rating">
              <span class="stars"><i class="fa-solid fa-star"></i></span>
              <span>${p.averageRating}</span>
              <span style="color:var(--text-light);font-weight:normal;">(${p.reviewCount})</span>
            </div>
            <div class="product-price-row">
              <div>
                <span class="product-price">₹${p.price}</span>
                <span class="product-unit">/ ${p.unit}</span>
              </div>
              <span style="font-size:0.75rem;color:${p.stockQuantity > 0 ? 'var(--secondary-color)' : 'var(--danger-color)'};font-weight:700;">
                ${p.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            <div class="product-footer-actions">
              <button class="btn btn-primary btn-block btn-sm" onclick="cart.add('${p.id}', 1)" ${p.stockQuantity <= 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-cart-shopping"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.renderPagination(meta);
  },

  renderPagination(meta) {
    const container = document.getElementById('products-pagination');
    if (!container || !meta || meta.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = '';
    if (meta.page > 1) {
      html += `<button class="btn btn-light btn-sm" onclick="products.goToPage(${meta.page - 1})"><i class="fa-solid fa-chevron-left"></i> Prev</button>`;
    }

    for (let i = 1; i <= meta.totalPages; i++) {
      html += `
        <button class="btn btn-sm ${i === meta.page ? 'btn-primary' : 'btn-light'}" onclick="products.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (meta.page < meta.totalPages) {
      html += `<button class="btn btn-light btn-sm" onclick="products.goToPage(${meta.page + 1})">Next <i class="fa-solid fa-chevron-right"></i></button>`;
    }

    container.innerHTML = html;
  },

  goToPage(pageNum) {
    this.state.page = pageNum;
    this.fetchProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async toggleWishlist(productId, btnEl) {
    try {
      const res = await api.post('/wishlist', { productId });
      const isWishlisted = res.data.isWishlisted;
      toast.info(res.message);
      if (btnEl) {
        btnEl.classList.toggle('active', isWishlisted);
        btnEl.innerHTML = isWishlisted ? '<i class="fa-solid fa-heart" style="color:var(--danger-color);"></i>' : '<i class="fa-regular fa-heart"></i>';
      }
      window.updateBadges?.();
    } catch (e) {
      toast.error('Failed to update wishlist');
    }
  },

  bindEvents() {
    // Sort dropdown
    const sortSelect = document.getElementById('product-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.state.page = 1;
        this.fetchProducts();
      });
    }

    // Search filter input
    const searchInput = document.getElementById('product-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.search = e.target.value.trim();
        this.state.page = 1;
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.fetchProducts();
      });
    }

    // Price filter
    const minPriceInput = document.getElementById('min-price-input');
    const maxPriceInput = document.getElementById('max-price-input');
    const priceFilterBtn = document.getElementById('apply-price-filter');

    if (priceFilterBtn) {
      priceFilterBtn.addEventListener('click', () => {
        this.state.minPrice = minPriceInput?.value || '';
        this.state.maxPrice = maxPriceInput?.value || '';
        this.state.page = 1;
        this.fetchProducts();
      });
    }

    // Organic checkbox
    const organicCheck = document.getElementById('organic-only-checkbox');
    if (organicCheck) {
      organicCheck.addEventListener('change', (e) => {
        this.state.organic = e.target.checked;
        this.state.page = 1;
        this.fetchProducts();
      });
    }

    // Verified farmer checkbox
    const verifiedCheck = document.getElementById('verified-only-checkbox');
    if (verifiedCheck) {
      verifiedCheck.addEventListener('change', (e) => {
        this.state.verifiedOnly = e.target.checked;
        this.state.page = 1;
        this.fetchProducts();
      });
    }
  },

  resetFilters() {
    this.state = {
      search: '',
      category: 'all',
      minPrice: '',
      maxPrice: '',
      organic: false,
      verifiedOnly: false,
      sortBy: 'newest',
      page: 1,
      limit: 12,
    };
    window.location.search = '';
    this.fetchProducts();
  }
};

window.products = products;
