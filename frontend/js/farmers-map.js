// frontend/js/farmers-map.js
/**
 * FarmDirect Interactive Farmers Map
 * Uses MapLibre GL JS with OpenFreeMap Vector Tiles
 * Style: https://tiles.openfreemap.org/styles/liberty
 * No API key required. Fast, open, responsive.
 */

const farmersMap = {
  map: null,
  markers: [],
  userMarker: null,
  farmersData: [],
  userLocation: null,

  async init() {
    this.initMap();
    await this.fetchFarmers();
    this.bindEvents();
    this.requestUserLocation();
  },

  initMap() {
    const mapContainer = document.getElementById('farmers-map');
    if (!mapContainer || typeof maplibregl === 'undefined') return;

    // Centered on Central India [longitude, latitude]
    this.map = new maplibregl.Map({
      container: 'farmers-map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [78.9629, 20.5937], // [lng, lat]
      zoom: 4.8,
      attributionControl: false // Configured with custom attribution below
    });

    // Navigation Controls (Zoom in, Zoom out, Compass rotation)
    this.map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // Attribution: OpenFreeMap, OpenMapTiles, and OpenStreetMap
    this.map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      })
    );

    // Auto resize map when container bounds shift
    window.addEventListener('resize', () => {
      this.map?.resize();
    });
  },

  async fetchFarmers(lat = null, lng = null, radius = 1000) {
    try {
      let endpoint = '/farmers';
      const params = {};

      if (lat && lng) {
        endpoint = '/farmers/nearby';
        params.lat = lat;
        params.lng = lng;
        params.radius = radius;
      }

      const res = await api.get(endpoint, params);
      this.farmersData = res.data;

      // Update count badge
      const countEl = document.getElementById('farmers-map-count');
      if (countEl) countEl.textContent = this.farmersData.length;

      this.renderMarkers();
      this.renderFarmersList();
    } catch (err) {
      console.error('Error fetching farmers for map:', err);
      toast.error('Could not load farm locations');
    }
  },

  renderMarkers() {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasCoords = false;

    this.farmersData.forEach(farmer => {
      if (!farmer.latitude || !farmer.longitude) return;

      const lng = parseFloat(farmer.longitude);
      const lat = parseFloat(farmer.latitude);

      // Custom Farm Marker Element
      const el = document.createElement('div');
      el.className = 'custom-farm-pin';
      el.setAttribute('role', 'button');
      el.setAttribute('title', farmer.farmName);
      el.innerHTML = `
        <div style="background:#166534;color:#fff;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);font-size:17px;cursor:pointer;transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          🌾
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        const pin = el.firstElementChild;
        if (pin) pin.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        const pin = el.firstElementChild;
        if (pin) pin.style.transform = 'scale(1)';
      });

      // Interactive Popup
      const popupContent = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:240px;padding:2px;">
          <img src="${farmer.farmPhoto || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400'}" alt="${farmer.farmName}" style="width:100%;height:115px;object-fit:cover;border-radius:8px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <strong style="font-size:15px;color:#17231B;">${farmer.farmName}</strong>
            ${farmer.verificationStatus === 'VERIFIED' ? '<span style="color:#166534;font-size:13px;font-weight:bold;" title="Verified Farm">✓</span>' : ''}
          </div>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">
            📍 ${farmer.district}, ${farmer.state} ${farmer.distanceKm ? `(${farmer.distanceKm} km away)` : ''}
          </div>
          <div style="font-size:12px;color:#b45309;font-weight:bold;margin-bottom:10px;">
            ★ ${farmer.rating} (${farmer.totalReviews} reviews) • ${farmer.farmingCategory || 'Farm Produce'}
          </div>
          <div style="display:flex;gap:6px;">
            <a href="/farmer-profile.html?id=${farmer.id}" style="flex:1;text-align:center;background:#166534;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600;">
              View Farm
            </a>
            <a href="/products.html?category=all" style="flex:1;text-align:center;background:#dcfce7;color:#166534;padding:6px 10px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600;">
              Products (${farmer.productCount})
            </a>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 22,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '280px'
      }).setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
      bounds.extend([lng, lat]);
      hasCoords = true;
    });

    if (hasCoords) {
      if (this.map.loaded()) {
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 11 });
      } else {
        this.map.once('load', () => {
          this.map.fitBounds(bounds, { padding: 60, maxZoom: 11 });
        });
      }
    }
  },

  renderFarmersList() {
    const listContainer = document.getElementById('farmers-cards-list');
    const gridContainer = document.getElementById('farmers-grid');
    if (!listContainer) return;

    if (this.farmersData.length === 0) {
      const emptyHtml = `
        <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
          No farms located in this radius. Try widening your search distance.
        </div>
      `;
      listContainer.innerHTML = emptyHtml;
      if (gridContainer) gridContainer.innerHTML = emptyHtml;
      return;
    }

    const cardsHtml = this.farmersData.map(f => `
      <div class="card" style="padding:1.25rem;display:flex;gap:1rem;align-items:center;cursor:pointer;transition:var(--transition);" onclick="farmersMap.focusFarm(${f.latitude}, ${f.longitude})">
        <img src="${f.farmPhoto}" alt="${f.farmName}" style="width:72px;height:72px;border-radius:var(--radius-md);object-fit:cover;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:0.4rem;font-weight:700;font-size:1rem;color:var(--text-dark);">
            <span>${f.farmName}</span>
            ${f.verificationStatus === 'VERIFIED' ? '<span class="badge badge-verified" style="font-size:0.7rem;">Verified</span>' : ''}
          </div>
          <div style="font-size:0.825rem;color:var(--text-muted);margin:0.2rem 0;">
            📍 ${f.district}, ${f.state} ${f.distanceKm ? `• <strong>${f.distanceKm} km</strong>` : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--secondary-color);font-weight:600;">
            ★ ${f.rating} • ${f.productCount} Fresh Products Listed
          </div>
        </div>
        <a href="/farmer-profile.html?id=${f.id}" class="btn btn-outline btn-sm" onclick="event.stopPropagation();">
          Profile
        </a>
      </div>
    `).join('');

    listContainer.innerHTML = cardsHtml;
    if (gridContainer) gridContainer.innerHTML = cardsHtml;
  },

  focusFarm(lat, lng) {
    if (this.map && lat && lng) {
      const longitude = parseFloat(lng);
      const latitude = parseFloat(lat);

      this.map.flyTo({
        center: [longitude, latitude],
        zoom: 12.5,
        essential: true,
        speed: 1.2
      });

      // Find corresponding marker and trigger popup
      const target = this.markers.find(m => {
        const pos = m.getLngLat();
        return Math.abs(pos.lat - latitude) < 0.001 && Math.abs(pos.lng - longitude) < 0.001;
      });

      if (target) {
        target.togglePopup();
      }

      window.scrollTo({
        top: document.getElementById('farmers-map')?.offsetTop - 80 || 0,
        behavior: 'smooth'
      });
    }
  },

  requestUserLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          // Remove old user marker if any
          if (this.userMarker) {
            this.userMarker.remove();
          }

          // User GPS Marker
          const userEl = document.createElement('div');
          userEl.innerHTML = `
            <div style="background:#2563eb;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(37,99,235,0.7);animation:pulse 2s infinite;"></div>
          `;

          this.userMarker = new maplibregl.Marker({ element: userEl, anchor: 'center' })
            .setLngLat([this.userLocation.lng, this.userLocation.lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML('<strong>Your Detected Location</strong>'))
            .addTo(this.map);

          toast.success('Location detected! Sorting nearby farmers.');
          this.fetchFarmers(this.userLocation.lat, this.userLocation.lng, 800);
        },
        (err) => {
          console.log('Location permission not granted. Displaying national farm map.');
        }
      );
    }
  },

  bindEvents() {
    // Radius selector
    const distSelect = document.getElementById('radius-select');
    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        const radius = e.target.value;
        if (this.userLocation) {
          this.fetchFarmers(this.userLocation.lat, this.userLocation.lng, radius);
        } else {
          toast.info('Searching farmers across India');
          this.fetchFarmers();
        }
      });
    }

    // Toggle view (Map vs Grid)
    const toggleBtn = document.getElementById('toggle-view-btn');
    const mapSection = document.getElementById('map-view-section');
    const gridSection = document.getElementById('grid-view-section');

    if (toggleBtn && mapSection && gridSection) {
      toggleBtn.addEventListener('click', () => {
        const isMapVisible = mapSection.style.display !== 'none';
        if (isMapVisible) {
          mapSection.style.display = 'none';
          gridSection.style.display = 'grid';
          toggleBtn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Switch to Map View';
        } else {
          mapSection.style.display = 'grid';
          gridSection.style.display = 'none';
          toggleBtn.innerHTML = '<i class="fa-solid fa-list"></i> Switch to List View';
          setTimeout(() => this.map?.resize(), 150);
        }
      });
    }
  }
};

window.farmersMap = farmersMap;
