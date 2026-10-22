/**
 * api.js — klien HTTP ke Google Apps Script Web App.
 *
 * CATATAN KEAMANAN TOKEN:
 * GAS Web App tidak bisa membaca request header (limitasi platform), sehingga:
 *   - GET  : token dikirim via query param (?token=...) — muncul di URL, browser history, dan server log GAS
 *   - POST : token dikirim via request body (JSON) — lebih aman
 *
 * Mitigasi yang sudah diterapkan:
 *   1. TTL token pendek (24 jam di GAS Auth.gs)
 *   2. Token di-invalidate saat logout dan saat password direset/diganti
 *   3. GAS hanya dapat diakses via HTTPS
 *   4. Tidak ada link eksternal di UI yang bisa membocorkan token via Referer header
 *
 * GAS_API_URL dibaca dari <meta name="gas-api-url"> di index.html.
 */
const Api = {
  baseUrl: null,

  /** Inisialisasi base URL dari meta tag / window. */
  init() {
    if (window.__GAS_API_URL__ && typeof window.__GAS_API_URL__ === 'string') {
      this.baseUrl = window.__GAS_API_URL__;
      return;
    }
    const meta = document.querySelector('meta[name="gas-api-url"]');
    this.baseUrl = meta ? meta.getAttribute('content') : '';
  },

  _ensureUrl() {
    if (this.baseUrl == null) this.init();
    if (!this.baseUrl) {
      throw new Error('URL API belum dikonfigurasi. Isi <meta name="gas-api-url"> di index.html dengan URL Web App GAS.');
    }
    return this.baseUrl;
  },

  _token() {
    return Auth.getToken();
  },

  /** GET: params + token sebagai query string. Return response.data. */
  async get(action, params) {
    const base = this._ensureUrl();
    params = params || {};
    const query = new URLSearchParams();
    query.set('action', action);
    const token = this._token();
    if (token) query.set('token', token);
    for (const key in params) {
      if (params[key] != null && params[key] !== '') query.set(key, params[key]);
    }
    const url = base + '?' + query.toString();
    const resp = await fetch(url, { method: 'GET' });
    return this._handle(resp);
  },

  /** POST: {action, payload, token} sebagai JSON body. */
  async post(action, payload) {
    const base = this._ensureUrl();
    payload = payload || {};
    const body = { action: action, payload: payload };
    const token = this._token();
    if (token) body.token = token;
    const resp = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : ''
      },
      body: JSON.stringify(body)
    });
    return this._handle(resp);
  },

  async _handle(resp) {
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      throw new Error('Respons server tidak valid. Periksa konfigurasi URL API.');
    }
    if (data && data.success === false) {
      const msg = (data.error && data.error.message) ? data.error.message : 'Terjadi kesalahan';
      const code = (data.error && data.error.code) || 'SERVER_ERROR';
      // 401 → logout otomatis
      if (code === 'UNAUTHORIZED' && Auth.isAuthenticated()) {
        Auth.clearSession();
        Router.navigate('/login');
      }
      const err = new Error(msg);
      err.code = code;
      throw err;
    }
    return data ? data.data : null;
  }
};
