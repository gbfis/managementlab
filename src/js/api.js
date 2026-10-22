/**
 * api.js — klien HTTP ke Cloudflare Pages Function proxy (/api).
 *
 * Semua request dikirim ke /api (same-origin) — tidak ada CORS issue.
 * Pages Function di functions/api.js meneruskan ke GAS dari server-side.
 *
 * Pola Optimistic UI:
 * - get()  : fetch data, tidak tampilkan sync indicator
 * - post() : mutasi data, otomatis tampilkan Sync indicator di pojok kanan atas
 *            Sync.start() → Sync.done() atau Sync.fail()
 */
const Api = {
  _proxyUrl: '/api',

  /** Backward-compatible — tidak perlu setup apapun */
  init() {},

  _token() {
    return Auth.getToken();
  },

  /** Fetch data — tanpa sync indicator */
  async get(action, params) {
    return this._request(action, params || {}, false);
  },

  /** Mutasi data — tampilkan sync indicator otomatis */
  async post(action, payload) {
    return this._request(action, payload || {}, true);
  },

  async _request(action, payload, isMutation) {
    const token = this._token();
    const body = { action, payload };
    if (token) body.token = token;

    // Tunjukkan sync indicator hanya untuk operasi tulis
    const writeActions = new Set([
      'createLab', 'updateLab', 'deleteLab',
      'createAlat', 'updateAlat', 'deleteAlat',
      'createPeminjaman', 'approvePeminjaman', 'rejectPeminjaman', 'returnPeminjaman',
      'createUser', 'updateUser', 'resetPassword', 'unlockUser',
      'createLaporanKerusakan', 'updateTindakLanjut', 'selesaikanTindakLanjut',
      'changePassword', 'updateProfile'
    ]);

    const showSync = isMutation && writeActions.has(action);
    if (showSync && typeof Sync !== 'undefined') Sync.start();

    let resp;
    try {
      resp = await fetch(this._proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      if (showSync && typeof Sync !== 'undefined') Sync.fail('Tidak dapat terhubung');
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }

    return this._handle(resp, showSync);
  },

  async _handle(resp, showSync) {
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      if (showSync && typeof Sync !== 'undefined') Sync.fail('Respons tidak valid');
      throw new Error('Respons server tidak valid.');
    }

    if (data && data.success === false) {
      const msg = (data.error && data.error.message) ? data.error.message : 'Terjadi kesalahan';
      const code = (data.error && data.error.code) || 'SERVER_ERROR';

      if (showSync && typeof Sync !== 'undefined') Sync.fail(msg.length > 30 ? 'Gagal disimpan' : msg);

      if (code === 'UNAUTHORIZED' && Auth.isAuthenticated()) {
        Auth.clearSession();
        Router.navigate('/login');
      }
      const err = new Error(msg);
      err.code = code;
      throw err;
    }

    if (showSync && typeof Sync !== 'undefined') Sync.done('Tersimpan');
    return data ? data.data : null;
  }
};
