/**
 * toast.js — notifikasi toast (aman, tanpa innerHTML).
 */
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
      if (!this._container) {
        this._container = Dom.createElement('div', {
          id: 'toast-container',
          class: 'toast-container'
        });
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  /**
   * Tampilkan toast.
   * @param {string} message - pesan (dirender pakai textContent)
   * @param {string} [type='info'] - 'success' | 'error' | 'info'
   */
  show(message, type) {
    const t = type || 'info';
    const cls = 'toast toast-' + t;
    const el = Dom.createElement('div', { class: cls, role: t === 'error' ? 'alert' : 'status' });
    el.textContent = String(message);
    this._getContainer().appendChild(el);

    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 150);
    }, 4000);
  },

  success(msg) {
    this.show(msg, 'success');
  },

  error(msg) {
    this.show(msg, 'error');
  },

  info(msg) {
    this.show(msg, 'info');
  }
};
