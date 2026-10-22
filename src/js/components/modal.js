/**
 * modal.js — dialog modal dengan focus trap, ESC, aria-modal.
 * Konten dirender dari fungsi (DOM element), bukan string HTML.
 *
 * Catatan: Modal adalah singleton (satu _overlay). Membuka modal kedua
 * saat yang pertama terbuka akan menutup yang pertama. State modal lama
 * (_lastFocused/_onClose) hilang. Asumsi ini sengaja — saat ini tidak ada
 * alur modal bertingkat; bila nanti perlu, antrekan atau refaktor ke stack.
 */
const Modal = {
  _overlay: null,
  _lastFocused: null,
  _onClose: null,
  _keyHandler: null,

  /**
   * Handler klik tombol modal.
   * Modal hanya ditutup bila onClick selesai tanpa melempar dan tidak
   * mengembalikan false (sinyal "pertahankan terbuka"). Path error
   * (validasi gagal / API gagal) TIDAK boleh menutup modal agar input
   * yang sudah diketik tidak hilang.
   */
  async _handleBtnClick(btn) {
    if (typeof btn.onClick !== 'function') {
      if (btn.closeOnClick !== false) this.close();
      return;
    }
    let result;
    try {
      result = await Promise.resolve(btn.onClick());
    } catch (err) {
      // onClick melempar — biarkan modal tetap terbuka.
      // Penampilan error adalah tanggung jawab onClick (mis. Toast.error).
      return;
    }
    if (btn.closeOnClick === false) return;
    if (result === false) return; // onClick sinyal: jangan tutup
    this.close();
  },

  /**
   * Buka modal.
   * @param {string} title - judul modal
   * @param {function} contentFn - fungsi return DOM element sebagai konten
   * @param {Array} [buttons] - [{ label, type:'primary'|'secondary'|'danger', onClick, closeOnClick }]
   * @param {function} [onClose] - callback saat modal ditutup
   */
  open(title, contentFn, buttons, onClose) {
    this.close();
    this._onClose = onClose || null;
    this._lastFocused = document.activeElement;

    const overlay = Dom.createElement('div', { class: 'modal-overlay', role: 'presentation' });
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) this.close();
    });

    const modal = Dom.createElement('div', {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': title
    });
    overlay.appendChild(modal);

    // Header
    const header = Dom.createElement('div', { class: 'modal-header' });
    header.appendChild(Dom.createElement('h2', { class: 'modal-title', text: title }));
    const closeBtn = Dom.createElement('button', {
      class: 'modal-close',
      type: 'button',
      'aria-label': 'Tutup',
      text: '\u00d7',
      onClick: () => this.close()
    });
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Body
    const body = Dom.createElement('div', { class: 'modal-body' });
    if (typeof contentFn === 'function') {
      const content = contentFn();
      if (content) {
        if (Array.isArray(content)) {
          content.forEach((c) => c && body.appendChild(c));
        } else {
          body.appendChild(content);
        }
      }
    } else if (contentFn instanceof Node) {
      body.appendChild(contentFn);
    }
    modal.appendChild(body);

    // Footer (tombol)
    if (buttons && buttons.length) {
      const footer = Dom.createElement('div', { class: 'modal-footer' });
      buttons.forEach((btn) => {
        const type = btn.type || 'secondary';
        const cls = 'btn ' + (type === 'primary' ? 'btn-primary' : type === 'danger' ? 'btn-danger' : 'btn-secondary');
        const b = Dom.createElement('button', {
          class: cls,
          type: 'button',
          text: btn.label || '',
          onClick: () => this._handleBtnClick(btn)
        });
        footer.appendChild(b);
      });
      modal.appendChild(footer);
    }

    document.getElementById('modal-container').appendChild(overlay);
    this._overlay = overlay;

    // Trap focus + ESC
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Tab') {
        this._trapFocus(e, modal);
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Fokus ke elemen pertama yang bisa difokus
    setTimeout(() => {
      const focusable = modal.querySelector('input, select, textarea, button:not(.modal-close)');
      if (focusable) focusable.focus();
      else closeBtn.focus();
    }, 0);
  },

  _trapFocus(e, container) {
    const focusables = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  close() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._overlay) {
      if (this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
    if (typeof this._onClose === 'function') {
      const cb = this._onClose;
      this._onClose = null;
      cb();
    }
    if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
      this._lastFocused.focus();
      this._lastFocused = null;
    }
  },

  /**
   * Shortcut konfirmasi sederhana.
   * @param {string} title
   * @param {string} message
   * @param {function} onConfirm
   * @param {object} [opts] - { confirmLabel, cancelLabel, danger }
   */
  confirm(title, message, onConfirm, opts) {
    opts = opts || {};
    this.open(title, () => Dom.createElement('p', { text: message }), [
      {
        label: opts.cancelLabel || 'Batal',
        type: 'secondary',
        onClick: () => {}
      },
      {
        label: opts.confirmLabel || 'Konfirmasi',
        type: opts.danger ? 'danger' : 'primary',
        closeOnClick: true,
        onClick: () => { if (typeof onConfirm === 'function') onConfirm(); }
      }
    ]);
  }
};
