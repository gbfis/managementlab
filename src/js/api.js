/**
 * api.js — klien HTTP ke Cloudflare Pages Function proxy (/api).
 *
 * Semua request dikirim ke /api (same-origin) — tidak ada CORS issue.
 * Pages Function di src/functions/api.js meneruskan ke GAS dari server-side.
 *
 * Mengapa tidak langsung ke GAS?
 * GAS Web App selalu redirect POST ke script.googleusercontent.com (beda origin).
 * Browser memblok redirect ini karena CORS. Proxy server-side menghindari masalah ini.
 */
const Api = {
  // Proxy endpoint — relative URL, same-origin dengan Cloudflare Pages
  _proxyUrl: '/api',

  /** Backward-compatible init — tidak perlu melakukan apa-apa lagi karena URL sudah tetap /api */
  init() {},

  _token() {
    return Auth.getToken();
  },

  async get(action, params) {
    return this._request(action, params || {});
  },

  async post(action, payload) {
    return this._request(action, payload || {});
  },

  async _request(action, payload) {
    const token = this._token();

    const body = { action, payload };
    if (token) body.token = token;

    let resp;
    try {
      resp = await fetch(this._proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }

    return this._handle(resp);
  },

  async _handle(resp) {
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      throw new Error('Respons server tidak valid.');
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
