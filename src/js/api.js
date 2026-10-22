/**
 * api.js — klien HTTP ke Google Apps Script Web App.
 *
 * PENTING — CORS & GAS:
 * GAS Web App tidak support preflight OPTIONS request. Solusinya:
 *   - Semua request (GET maupun POST) dikirim sebagai POST
 *   - Content-Type: text/plain (BUKAN application/json) agar tidak trigger preflight
 *   - Body tetap berisi JSON string yang valid
 *   - Token dikirim di dalam body JSON (bukan header Authorization)
 *
 * Dengan cara ini browser tidak melakukan preflight dan CORS error tidak terjadi.
 *
 * GAS_API_URL dibaca dari <meta name="gas-api-url"> di index.html.
 */
const Api = {
  baseUrl: null,

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
      throw new Error('URL API belum dikonfigurasi. Isi meta[name="gas-api-url"] di index.html.');
    }
    return this.baseUrl;
  },

  _token() {
    return Auth.getToken();
  },

  /**
   * GET via POST — kirim action + params sebagai payload POST.
   * Ini menghindari CORS preflight yang GAS tidak support.
   */
  async get(action, params) {
    return this._request(action, params || {});
  },

  /**
   * POST — kirim action + payload.
   */
  async post(action, payload) {
    return this._request(action, payload || {});
  },

  /**
   * Core request: selalu POST, Content-Type: text/plain, body JSON string.
   */
  async _request(action, payload) {
    const base = this._ensureUrl();
    const token = this._token();

    const body = {
      action: action,
      payload: payload
    };
    if (token) body.token = token;

    const resp = await fetch(base, {
      method: 'POST',
      // text/plain tidak trigger CORS preflight — kunci utama agar GAS bisa diakses
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body)
    });

    return this._handle(resp);
  },

  async _handle(resp) {
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      throw new Error('Respons server tidak valid. Periksa URL API di index.html.');
    }
    if (data && data.success === false) {
      const msg = (data.error && data.error.message) ? data.error.message : 'Terjadi kesalahan';
      const code = (data.error && data.error.code) || 'SERVER_ERROR';
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
