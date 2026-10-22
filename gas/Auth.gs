/**
 * Auth.gs
 * Autentikasi: login, logout, validasi token, profil user.
 */

/** TTL token dalam detik (24 jam) */
const TOKEN_TTL_SECONDS = 86400;

/**
 * Login: cari user → verifikasi password → cek status → generate token.
 * @param {string} email
 * @param {string} password
 * @param {object} [e] - GAS event (untuk IP)
 * @returns {{token: string, user: object}}
 */
function login(email, password, e) {
  const ip = getCurrentIP(e);

  // Cari user berdasarkan email
  const result = findRow('users', getHeaders('users').indexOf('email'), email.trim().toLowerCase());
  if (!result) {
    logAudit(email, 'login_failed', { reason: 'user_not_found' }, ip);
    throw { code: 'UNAUTHORIZED', message: 'Email atau password salah' };
  }

  const user = result.data;
  const rowIndex = result.rowIndex;

  // Cek status akun
  if (user.status === 'nonaktif') {
    logAudit(email, 'login_failed', { reason: 'nonaktif' }, ip);
    throw { code: 'UNAUTHORIZED', message: 'Akun Anda dinonaktifkan' };
  }
  if (user.status === 'terkunci') {
    logAudit(email, 'login_failed', { reason: 'terkunci' }, ip);
    throw { code: 'UNAUTHORIZED', message: 'Akun terkunci. Hubungi admin untuk membuka kunci' };
  }

  // Verifikasi password
  const isValid = verifyPassword(password, user.salt, user.password_hash);
  if (!isValid) {
    const currentAttempt = parseInt(user.login_attempt || 0) + 1;
    updateRow('users', rowIndex, {
      login_attempt: currentAttempt,
      updated_at: new Date().toISOString()
    });

    if (currentAttempt >= 5) {
      updateRow('users', rowIndex, { status: 'terkunci', updated_at: new Date().toISOString() });
      logAudit(email, 'account_locked', { login_attempt: currentAttempt }, ip);
    }

    logAudit(email, 'login_failed', { login_attempt: currentAttempt }, ip);
    throw { code: 'UNAUTHORIZED', message: 'Email atau password salah' };
  }

  // Login berhasil — reset login_attempt
  updateRow('users', rowIndex, {
    login_attempt: 0,
    updated_at: new Date().toISOString()
  });

  // Generate dan simpan token
  const token = generateToken(user.id);
  const expiry = Date.now() + (TOKEN_TTL_SECONDS * 1000);
  PropertiesService.getScriptProperties().setProperty(token, `${user.id}|${expiry}`);

  logAudit(email, 'login', { user_id: user.id, role: user.role }, ip);

  return {
    token,
    user: _sanitizeUser(user)
  };
}

/**
 * Logout: hapus token dari PropertiesService.
 * @param {string} token
 * @param {string} [userEmail]
 */
function logout(token, userEmail) {
  if (token) {
    PropertiesService.getScriptProperties().deleteProperty(token);
  }
  logAudit(userEmail || 'unknown', 'logout', { token_prefix: token ? token.slice(0, 8) : '' });
}

/**
 * Validasi token: cek ada di PropertiesService dan belum expired.
 * @param {string} token
 * @returns {{userId: string, expiry: number}}
 * @throws {{code: string, message: string}}
 */
function validateToken(token) {
  if (!token) {
    throw { code: 'UNAUTHORIZED', message: 'Token tidak ditemukan' };
  }

  const stored = PropertiesService.getScriptProperties().getProperty(token);
  if (!stored) {
    throw { code: 'UNAUTHORIZED', message: 'Token tidak valid atau sudah expired' };
  }

  const parts = stored.split('|');
  if (parts.length !== 2) {
    throw { code: 'UNAUTHORIZED', message: 'Token tidak valid' };
  }

  const userId = parts[0];
  const expiry = parseInt(parts[1], 10);

  if (Date.now() > expiry) {
    PropertiesService.getScriptProperties().deleteProperty(token);
    throw { code: 'UNAUTHORIZED', message: 'Token sudah expired, silakan login kembali' };
  }

  return { userId, expiry };
}

/**
 * Ambil user saat ini berdasarkan token.
 * @param {string} token
 * @returns {object} user (tanpa password_hash dan salt)
 */
function getCurrentUser(token) {
  const { userId } = validateToken(token);
  const result = findRowById('users', userId);
  if (!result) {
    throw { code: 'UNAUTHORIZED', message: 'User tidak ditemukan' };
  }
  return _sanitizeUser(result.data);
}

/**
 * Reset login_attempt ke 0 untuk user.
 * @param {string} userId
 */
function resetLoginAttempt(userId) {
  const result = findRowById('users', userId);
  if (!result) throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  updateRow('users', result.rowIndex, { login_attempt: 0, updated_at: new Date().toISOString() });
}

/**
 * Set status user ke 'terkunci'.
 * @param {string} userId
 */
function lockUser(userId) {
  const result = findRowById('users', userId);
  if (!result) throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  updateRow('users', result.rowIndex, { status: 'terkunci', updated_at: new Date().toISOString() });
}

/**
 * Hapus field sensitif dari object user sebelum dikirim ke frontend.
 * @param {object} user
 * @returns {object}
 */
function _sanitizeUser(user) {
  const { password_hash, salt, ...safeUser } = user;
  return safeUser;
}

/**
 * Invalidasi semua token aktif milik seorang user.
 * Iterasi PropertiesService, hapus entry yang value-nya berawalan `userId|`.
 * Dipanggil saat password direset/diganti untuk keamanan.
 * @param {string} userId
 */
function _invalidateUserTokens(userId) {
  var props = PropertiesService.getScriptProperties();
  var keys = props.getProperties();
  var prefix = userId + '|';
  for (var key in keys) {
    if (keys.hasOwnProperty(key) && String(keys[key]).indexOf(prefix) === 0) {
      props.deleteProperty(key);
    }
  }
}
