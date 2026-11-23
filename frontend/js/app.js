// frontend/js/app.js
/**
 * FarmDirect Core Application Shell & Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSearch();
  initMobileNav();
  updateBadges();
});

// Setup navigation state and dropdowns
function initNavbar() {
  const user = auth.getUser();
  const authNavContainer = document.getElementById('nav-auth-container');

  if (authNavContainer) {
    if (user) {
      const isFarmer = user.role === 'FARMER';
      const displayName = user.name || (isFarmer ? 'Farmer Portal' : 'My Account');
      const avatarInitial = displayName.charAt(0).toUpperCase();

      authNavContainer.innerHTML = `
        <div class="user-menu" id="user-menu-root">
          <button class="user-menu-btn" id="user-menu-trigger">
            <span class="user-avatar-badge">${avatarInitial}</span>
            <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayName}</span>
            <i class="fa-solid fa-chevron-down" style="font-size:0.75rem;"></i>
          </button>
          <div class="dropdown-menu" id="user-dropdown">
            <div class="dropdown-header">
              <div class="name">${displayName}</div>
              <div class="role">${user.role === 'FARMER' ? '🌾 Verified Farm Producer' : user.role === 'ADMIN' ? '🛡️ Administrator' : '🛒 Retail Customer'}</div>
            </div>
            ${isFarmer ? `
              <a href="/farmer/dashboard.html" class="dropdown-item">
                <i class="fa-solid fa-chart-line"></i> Farmer Dashboard
              </a>
              <a href="/farmer/products.html" class="dropdown-item">
                <i class="fa-solid fa-boxes-stacked"></i> Manage Products
              </a>
              <a href="/farmer/orders.html" class="dropdown-item">
                <i class="fa-solid fa-clipboard-list"></i> Incoming Orders
              </a>
              <a href="/farmer/profile.html" class="dropdown-item">
                <i class="fa-solid fa-tractor"></i> Farm Profile
              </a>
            ` : `
              <a href="/customer-profile.html" class="dropdown-item">
                <i class="fa-solid fa-user"></i> My Profile
              </a>
              <a href="/customer-orders.html" class="dropdown-item">
                <i class="fa-solid fa-box-open"></i> My Orders
              </a>
              <a href="/wishlist.html" class="dropdown-item">
                <i class="fa-solid fa-heart"></i> My Wishlist
              </a>
            `}
            <div class="dropdown-divider"></div>
            <a href="javascript:void(0)" onclick="auth.logout()" class="dropdown-item" style="color:var(--danger-color);">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
            </a>
          </div>
        </div>
      `;

      // Toggle dropdown menu
      const trigger = document.getElementById('user-menu-trigger');
      const dropdown = document.getElementById('user-dropdown');
      if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => {
          dropdown.classList.remove('active');
        });
      }
    } else {
      authNavContainer.innerHTML = `
        <a href="/login.html" class="btn btn-sm btn-outline" style="border-radius:var(--radius-full);">Sign In</a>
        <a href="/register.html" class="btn btn-sm btn-primary" style="border-radius:var(--radius-full);">Join Us</a>
      `;
    }
  }
}

// Global search bar handling
function initSearch() {
  const searchInputs = document.querySelectorAll('.header-search input');
  searchInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const query = encodeURIComponent(input.value.trim());
        window.location.href = `/products.html?search=${query}`;
      }
    });
  });
}

// Mobile navigation drawer toggle
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const backdrop = document.querySelector('.backdrop-overlay');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      if (backdrop) backdrop.classList.toggle('active');
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        navLinks.classList.remove('active');
        backdrop.classList.remove('active');
      });
    }
  }
}

// Refresh Cart and Wishlist count badges
async function updateBadges() {
  try {
    const cartRes = await api.get('/cart');
    const cartBadges = document.querySelectorAll('.cart-count-badge');
    const count = cartRes.data?.itemCount || 0;
    cartBadges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (e) {}

  try {
    const wishRes = await api.get('/wishlist');
    const wishBadges = document.querySelectorAll('.wishlist-count-badge');
    const count = wishRes.data?.length || 0;
    wishBadges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch (e) {}
}

window.updateBadges = updateBadges;
