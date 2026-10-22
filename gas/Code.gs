/**
 * Code.gs
 * Entry point utama GAS Web App.
 * doGet / doPost → handleRequest → dispatch ke handler masing-masing action.
 */

/**
 * Tangani semua GET request.
 * @param {object} e - GAS event
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Tangani semua POST request.
 * @param {object} e - GAS event
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Dispatcher utama: parse request → auth → rate limit → permission → execute.
 * @param {object} e - GAS event
 * @param {string} method - 'GET' | 'POST'
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleRequest(e, method) {
  let action, token, payload;

  try {
    if (method === 'GET') {
      action = e.parameter.action;
      token = e.parameter.token;
      // Untuk GET, payload diambil dari query params (kecuali action dan token)
      payload = Object.assign({}, e.parameter);
      delete payload.action;
      delete payload.token;
    } else {
      // POST: body berisi JSON string (Content-Type: text/plain untuk bypass CORS preflight)
      // Semua request (termasuk yang sebelumnya GET) dikirim via POST dari frontend.
      let body = {};
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        throw { code: 'VALIDATION_ERROR', message: 'Request body tidak valid (bukan JSON)' };
      }
      action = body.action;
      payload = body.payload || {};
      token = body.token || null;
    }

    if (!action) {
      return createErrorResponse('VALIDATION_ERROR', 'Parameter action wajib diisi');
    }

    // Action login tidak butuh token
    let currentUser = null;
    if (action !== 'login' && action !== 'requestPasswordReset' && action !== 'resetPasswordViaToken') {
      currentUser = getCurrentUser(token);
      checkRateLimit(currentUser.email);
      checkPermission(action, currentUser.role);
    }

    const result = _dispatch(action, payload, currentUser, e);
    return createSuccessResponse(result, _getSuccessMessage(action));

  } catch (err) {
    const code = (err && err.code) ? err.code : 'SERVER_ERROR';
    const message = (err && err.message) ? err.message : 'Terjadi kesalahan internal';
    return createErrorResponse(code, message);
  }
}

/**
 * Dispatcher: map action ke fungsi handler.
 * @param {string} action
 * @param {object} payload
 * @param {object} currentUser
 * @param {object} e - GAS event (untuk IP)
 * @returns {*}
 */
function _dispatch(action, payload, currentUser, e) {
  const ip = getCurrentIP(e);

  switch (action) {
    // === AUTH ===
    case 'login':
      return login(payload.email, payload.password, e);

    case 'logout':
      return logout(payload.token || _getTokenFromRequest(e, payload), currentUser.email);

    case 'me':
      return getMe(currentUser);

    case 'updateProfile':
      return updateProfile(payload, currentUser);

    case 'changePassword':
      return changePassword(payload.password_lama, payload.password_baru, currentUser);

    case 'requestPasswordReset':
      return requestPasswordReset(payload.email);

    case 'resetPasswordViaToken':
      return resetPasswordViaToken(payload.reset_token, payload.password_baru);

    // === LAB ===
    case 'getLabs':
      return getLabs(payload);

    case 'getLab':
      return getLab(payload.id);

    case 'createLab':
      return createLab(payload, currentUser);

    case 'updateLab':
      return updateLab(payload, currentUser);

    case 'deleteLab':
      return deleteLab(payload.id, currentUser);

    // === ALAT ===
    case 'getAlat':
      return getAlat(payload);

    case 'getAlatById':
      return getAlatById(payload.id);

    case 'createAlat':
      return createAlat(payload, currentUser);

    case 'updateAlat':
      return updateAlat(payload, currentUser);

    case 'deleteAlat':
      return deleteAlat(payload.id, currentUser);

    // === PEMINJAMAN ===
    case 'getPeminjaman':
      return getPeminjaman(payload, currentUser);

    case 'getPeminjamanById':
      return getPeminjamanById(payload.id, currentUser);

    case 'getMyPeminjaman':
      return getMyPeminjaman(payload, currentUser);

    case 'createPeminjaman':
      return createPeminjaman(payload, currentUser);

    case 'approvePeminjaman':
      return approvePeminjaman(payload.id, payload.catatan, currentUser);

    case 'rejectPeminjaman':
      return rejectPeminjaman(payload.id, payload.catatan, currentUser);

    case 'returnPeminjaman':
      return returnPeminjaman(payload.id, payload.kondisi, payload.catatan, payload.denda, currentUser);

    // === USER MANAGEMENT ===
    case 'getUsers':
      return getUsers(payload);

    case 'getUserById':
      return getUserById(payload.id);

    case 'createUser':
      return createUser(payload, currentUser);

    case 'updateUser':
      return updateUser(payload, currentUser);

    case 'resetPassword':
      return resetPassword(payload.id, payload.password_baru, currentUser);

    case 'unlockUser':
      return unlockUser(payload.id, currentUser);

    // === LAPORAN KERUSAKAN ===
    case 'getLaporanKerusakan':
      return getLaporanKerusakan(payload);

    case 'getLaporanKerusakanById':
      return getLaporanKerusakanById(payload.id);

    case 'createLaporanKerusakan':
      return createLaporanKerusakan(payload, currentUser);

    case 'updateTindakLanjut':
      return updateTindakLanjut(payload.id, payload, currentUser);

    case 'selesaikanTindakLanjut':
      return selesaikanTindakLanjut(payload.id, payload, currentUser);

    // === LAPORAN & STATISTIK ===
    case 'getReportPeminjaman':
      return getReportPeminjaman(payload.from, payload.to, payload.tipe, payload.status);

    case 'getReportAlat':
      return getReportAlat();

    case 'getReportOverdue':
      return getReportOverdue();

    case 'getDashboardStats':
      return getDashboardStats();

    case 'getAuditLog':
      return getAuditLog(payload);

    default:
      throw { code: 'NOT_FOUND', message: `Aksi '${action}' tidak dikenal` };
  }
}

/**
 * Buat response sukses.
 * @param {*} data
 * @param {string} [message]
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createSuccessResponse(data, message) {
  const response = JSON.stringify({
    success: true,
    data: data,
    message: message || 'Berhasil',
    timestamp: new Date().toISOString()
  });
  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Buat response error.
 * @param {string} code
 * @param {string} message
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createErrorResponse(code, message) {
  const response = JSON.stringify({
    success: false,
    error: {
      code: code || 'SERVER_ERROR',
      message: message || 'Terjadi kesalahan internal'
    }
  });
  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Rate limiting menggunakan CacheService: maks 60 request/menit per user.
 * @param {string} userEmail
 * @throws {{code: string, message: string}}
 */
function checkRateLimit(userEmail) {
  try {
    const cache = CacheService.getScriptCache();
    const key = 'rl_' + userEmail;
    const count = parseInt(cache.get(key) || '0', 10);

    if (count >= 60) {
      throw { code: 'RATE_LIMITED', message: 'Terlalu banyak request, coba lagi dalam 1 menit' };
    }

    cache.put(key, String(count + 1), 60); // reset setiap 60 detik
  } catch (err) {
    if (err.code === 'RATE_LIMITED') throw err;
    // Jika CacheService gagal, izinkan request (jangan block karena infra error)
    console.error('checkRateLimit error:', err);
  }
}

/**
 * Ekstrak Bearer token dari header Authorization.
 * GAS tidak expose header secara langsung di doPost, token bisa di body atau query.
 * @param {object} e
 * @returns {string|null}
 */
function _getBearerToken(e) {
  // GAS Web App tidak bisa baca header Authorization secara langsung.
  // Token dikirim via body.token (POST) atau ?token= (GET).
  return null;
}

/**
 * Ambil token dari request (body atau query param).
 * Untuk logout — ambil token yang sedang digunakan.
 * @param {object} e
 * @param {object} payload
 * @returns {string|null}
 */
function _getTokenFromRequest(e, payload) {
  if (payload && payload.token) return payload.token;
  if (e && e.parameter && e.parameter.token) return e.parameter.token;
  return null;
}

/**
 * Pesan sukses default per action.
 * @param {string} action
 * @returns {string}
 */
function _getSuccessMessage(action) {
  const messages = {
    login:                 'Login berhasil',
    logout:                'Logout berhasil',
    me:                    'Data profil berhasil diambil',
    updateProfile:         'Profil berhasil diperbarui',
    changePassword:        'Password berhasil diubah',
    requestPasswordReset:  'Permintaan reset password dikirim',
    resetPasswordViaToken: 'Password berhasil diubah',
    getLabs:               'Data lab berhasil diambil',
    getLab:                'Data lab berhasil diambil',
    createLab:             'Lab berhasil ditambahkan',
    updateLab:             'Lab berhasil diperbarui',
    deleteLab:             'Lab berhasil dihapus',
    getAlat:               'Data alat berhasil diambil',
    getAlatById:           'Data alat berhasil diambil',
    createAlat:            'Alat berhasil ditambahkan',
    updateAlat:            'Alat berhasil diperbarui',
    deleteAlat:            'Alat berhasil dihapus',
    getPeminjaman:         'Data peminjaman berhasil diambil',
    getPeminjamanById:     'Data peminjaman berhasil diambil',
    getMyPeminjaman:       'Riwayat peminjaman berhasil diambil',
    createPeminjaman:      'Peminjaman berhasil diajukan',
    approvePeminjaman:     'Peminjaman berhasil disetujui',
    rejectPeminjaman:      'Peminjaman berhasil ditolak',
    returnPeminjaman:      'Pengembalian berhasil dikonfirmasi',
    getUsers:              'Data user berhasil diambil',
    getUserById:           'Data user berhasil diambil',
    createUser:            'User berhasil ditambahkan',
    updateUser:            'User berhasil diperbarui',
    resetPassword:         'Password berhasil direset',
    unlockUser:            'Akun berhasil dibuka kuncinya',
    getLaporanKerusakan:   'Data laporan berhasil diambil',
    getLaporanKerusakanById: 'Data laporan berhasil diambil',
    createLaporanKerusakan: 'Laporan berhasil dibuat',
    updateTindakLanjut:    'Tindak lanjut berhasil diperbarui',
    selesaikanTindakLanjut: 'Laporan berhasil diselesaikan',
    getReportPeminjaman:   'Laporan peminjaman berhasil diambil',
    getReportAlat:         'Laporan alat berhasil diambil',
    getReportOverdue:      'Laporan overdue berhasil diambil',
    getDashboardStats:     'Statistik dashboard berhasil diambil',
    getAuditLog:           'Log audit berhasil diambil',
  };
  return messages[action] || 'Berhasil';
}
