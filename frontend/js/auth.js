// frontend/js/auth.js
/**
 * FarmDirect Authentication & Session State Handler
 */

const auth = {
  user: null,

  getUser() {
    const stored = localStorage.getItem('farmdirect_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  setUser(user) {
    if (user) {
      this.user = user;
      localStorage.setItem('farmdirect_user', JSON.stringify(user));
    } else {
      this.user = null;
      localStorage.removeItem('farmdirect_user');
    }
  },

  isLoggedIn() {
    return !!api.getToken() && !!this.getUser();
  },

  isFarmer() {
    const user = this.getUser();
    return user && user.role === 'FARMER';
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'ADMIN';
  },

  async login(loginIdentifier, password) {
    try {
      const response = await api.post('/auth/login', { loginIdentifier, password });
      api.setToken(response.token);
      this.setUser(response.user);
      return response;
    } catch (err) {
      throw err;
    }
  },

  async register(formData) {
    try {
      const response = await api.post('/auth/register', formData);
      api.setToken(response.token);
      this.setUser(response.user);
      return response;
    } catch (err) {
      throw err;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      api.setToken(null);
      this.setUser(null);
      window.location.href = '/index.html';
    }
  },

  async checkAuth() {
    if (!api.getToken()) {
      this.setUser(null);
      return null;
    }
    try {
      const res = await api.get('/auth/me');
      this.setUser(res.data);
      return res.data;
    } catch (err) {
      this.logout();
      return null;
    }
  },

  requireAuth(requiredRole = null) {
    const user = this.getUser();
    if (!api.getToken() || !user) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?redirect=${redirect}`;
      return false;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

window.auth = auth;
