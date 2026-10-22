/**
 * sync.js — Sync Indicator di pojok kanan atas.
 *
 * Menampilkan status sinkronisasi saat ada operasi yang sedang berjalan:
 * - "Menyimpan..." saat request sedang dikirim ke server
 * - "Tersimpan ✓" sesaat setelah berhasil
 * - "Gagal disimpan" jika terjadi error
 *
 * Terintegrasi dengan pola optimistic UI di Api — data ditampilkan
 * langsung di UI, indikator ini memberi tahu status sync ke server.
 */
const Sync = {
  _el: null,
  _hideTimer: null,
  _pendingCount: 0,

  /** Inisialisasi — panggil sekali dari app.js */
  init() {
    this._el = document.getElementById('sync-indicator');
    if (!this._el) {
      this._el = Dom.createElement('div', { id: 'sync-indicator', class: 'sync-indicator' });
      document.body.appendChild(this._el);
    }
  },

  /** Mulai operasi — tampilkan spinner "Menyimpan..." */
  start(message) {
    this._pendingCount++;
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    this._show('saving', message || 'Menyimpan...');
  },

  /** Operasi selesai sukses */
  done(message) {
    this._pendingCount = Math.max(0, this._pendingCount - 1);
    if (this._pendingCount > 0) return; // masih ada operasi lain berjalan
    this._show('saved', message || 'Tersimpan');
    this._hideTimer = setTimeout(() => this._hide(), 2500);
  },

  /** Operasi gagal */
  fail(message) {
    this._pendingCount = Math.max(0, this._pendingCount - 1);
    this._show('error', message || 'Gagal menyimpan');
    this._hideTimer = setTimeout(() => this._hide(), 4000);
  },

  _show(state, message) {
    if (!this._el) this.init();
    this._el.className = 'sync-indicator sync-' + state;
    Dom.clearChildren(this._el);

    if (state === 'saving') {
      const spinner = Dom.createElement('span', { class: 'sync-spinner' });
      this._el.appendChild(spinner);
    } else if (state === 'saved') {
      const icon = Dom.createElement('span', { class: 'sync-icon', text: '✓' });
      this._el.appendChild(icon);
    } else if (state === 'error') {
      const icon = Dom.createElement('span', { class: 'sync-icon', text: '✕' });
      this._el.appendChild(icon);
    }

    this._el.appendChild(Dom.createElement('span', { class: 'sync-text', text: message }));
    this._el.hidden = false;
  },

  _hide() {
    if (this._el) this._el.hidden = true;
  }
};
