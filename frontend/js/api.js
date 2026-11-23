// frontend/js/api.js
/**
 * FarmDirect Centralized API Client
 * Seamless communication with backend REST endpoints
 */

const API_BASE_URL = window.location.origin.includes(':5000')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('farmdirect_token') || null;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('farmdirect_token', token);
    } else {
      localStorage.removeItem('farmdirect_token');
    }
  }

  getGuestSession() {
    let guestId = localStorage.getItem('farmdirect_guest_id');
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('farmdirect_guest_id', guestId);
    }
    return guestId;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers = {
      'x-guest-session': this.getGuestSession(),
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type if FormData is used (browser sets multipart/form-data with boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
      credentials: 'omit', // We pass Bearer token in header
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid JSON response from server',
      }));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // HTTP Helpers
  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const api = new ApiClient();
window.api = api;
