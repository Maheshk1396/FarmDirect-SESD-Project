// frontend/js/notifications.js
/**
 * FarmDirect Toast Notification System
 */

const toast = {
  container: null,

  init() {
    if (!this.container) {
      let el = document.getElementById('toast-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
      }
      this.container = el;
    }
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toastEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <i class="fa-solid ${icon}" style="font-size:1.1rem;"></i>
        <span>${message}</span>
      </div>
      <button style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1rem;" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    this.container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(50px)';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};

window.toast = toast;
