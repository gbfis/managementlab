/**
 * User.gs
 * Manajemen user: CRUD, reset password, unlock akun.
 * TIDAK PERNAH mengembalikan password_hash atau salt ke frontend.
 */

/**
 * Ambil semua user (tanpa field sensitif).
 * @param {object} filters - { status?, role? }
 * @returns {object[]}
 */
function getUsers(filters) {
  const rows = getAllRows('users');
  const { status, role } = filters || {};

  return rows
    .filter(r => {
      if (status && r.status !== status) return false;
      if (role && r.role !== role) return false;
      return true;
    })
    .map(_sanitizeUserData);
}

/**
 * Ambil 1 user berdasarkan id (tanpa field sensitif).
 * @param {string} id
 * @returns {object}
 */
function getUserById(id) {
  validateUUID(id, 'id');
  const result = findRowById('users', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  }
  return _sanitizeUserData(result.data);
}

/**
 * Buat user baru.
 * @param {object} payload - { nama, email, nip_nim, role, no_wa?, password }
 * @param {object} currentUser
 * @returns {object}
 */
function createUser(payload, currentUser) {
  const { nama, email, nip_nim, role, no_wa, password } = payload;

  validateRequired(nama, 'Nama');
  validateRequired(email, 'Email');
  validateRequired(nip_nim, 'NIP/NIM');
  validateRequired(role, 'Role');
  validateRequired(password, 'Password');
  validateLength(nama, 2, 100, 'Nama');
  validateLength(password, 8, 255, 'Password');
  validateEnum(role, ['admin', 'staff', 'mahasiswa', 'dosen'], 'Role');

  if (!validateEmail(email)) {
    throw { code: 'VALIDATION_ERROR', message: 'Format email tidak valid' };
  }

  if (no_wa && !validateNoWa(no_wa)) {
    throw { code: 'VALIDATION_ERROR', message: 'Format nomor WhatsApp tidak valid (format: 08xx atau 628xx)' };
  }

  // Cek email unik
  const normalizedEmail = email.trim().toLowerCase();
  const existing = getAllRows('users');
  const dupEmail = existing.find(r => r.email && r.email.toLowerCase() === normalizedEmail);
  if (dupEmail) {
    throw { code: 'CONFLICT', message: 'Email sudah terdaftar' };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();

  const user = {
    id: generateUUID(),
    nama: sanitizeForSheet(String(nama).trim()),
    email: sanitizeForSheet(normalizedEmail),
    nip_nim: sanitizeForSheet(String(nip_nim).trim()),
    role: role,
    no_wa: sanitizeForSheet(String(no_wa || '').trim()),
    telegram_chat_id: '',
    password_hash: passwordHash,
    salt: salt,
    login_attempt: 0,
    status: 'aktif',
    created_at: now
  };

  appendRow('users', user);
  logAudit(currentUser.email, 'create_user', { id: user.id, email: user.email, role: user.role });

  return _sanitizeUserData(user);
}

/**
 * Update user. Hanya field yang diizinkan yang bisa diupdate.
 * @param {object} payload - { id, nama?, role?, status?, no_wa? }
 * @param {object} currentUser
 * @returns {object}
 */
function updateUser(payload, currentUser) {
  const { id, ...fields } = payload;
  validateUUID(id, 'id');

  const result = findRowById('users', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  }

  const updates = {};

  if (fields.nama !== undefined) {
    validateLength(fields.nama, 2, 100, 'Nama');
    updates.nama = sanitizeForSheet(String(fields.nama).trim());
  }
  if (fields.role !== undefined) {
    validateEnum(fields.role, ['admin', 'staff', 'mahasiswa', 'dosen'], 'Role');
    updates.role = fields.role;
  }
  if (fields.status !== undefined) {
    validateEnum(fields.status, ['aktif', 'nonaktif', 'terkunci'], 'Status');
    updates.status = fields.status;
  }
  if (fields.no_wa !== undefined) {
    if (fields.no_wa && !validateNoWa(fields.no_wa)) {
      throw { code: 'VALIDATION_ERROR', message: 'Format nomor WhatsApp tidak valid' };
    }
    updates.no_wa = sanitizeForSheet(String(fields.no_wa).trim());
  }

  updates.updated_at = new Date().toISOString();
  updateRow('users', result.rowIndex, updates);

  logAudit(currentUser.email, 'update_user', { id, updates: Object.keys(updates) });

  const updated = findRowById('users', id);
  return _sanitizeUserData(updated.data);
}

/**
 * Reset password user: generate salt baru, hash password baru.
 * @param {string} id
 * @param {string} newPassword
 * @param {object} currentUser
 */
function resetPassword(id, newPassword, currentUser) {
  validateUUID(id, 'id');
  validateRequired(newPassword, 'Password baru');
  validateLength(newPassword, 8, 255, 'Password baru');

  const result = findRowById('users', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);

  updateRow('users', result.rowIndex, {
    salt: salt,
    password_hash: passwordHash,
    updated_at: new Date().toISOString()
  });

  logAudit(currentUser.email, 'update_user', { id, action: 'reset_password' });
}

/**
 * Unlock akun user yang terkunci karena brute force.
 * Set login_attempt=0, status=aktif.
 * @param {string} id
 * @param {object} currentUser
 * @returns {object}
 */
function unlockUser(id, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('users', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  }

  updateRow('users', result.rowIndex, {
    login_attempt: 0,
    status: 'aktif',
    updated_at: new Date().toISOString()
  });

  logAudit(currentUser.email, 'update_user', { id, action: 'unlock_user' });

  const updated = findRowById('users', id);
  return _sanitizeUserData(updated.data);
}

/**
 * Update profil sendiri (nama, no_wa, telegram_chat_id).
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object}
 */
function updateProfile(payload, currentUser) {
  const result = findRowById('users', currentUser.id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  }

  const updates = {};

  if (payload.nama !== undefined) {
    validateLength(payload.nama, 2, 100, 'Nama');
    updates.nama = sanitizeForSheet(String(payload.nama).trim());
  }
  if (payload.no_wa !== undefined) {
    if (payload.no_wa && !validateNoWa(payload.no_wa)) {
      throw { code: 'VALIDATION_ERROR', message: 'Format nomor WhatsApp tidak valid' };
    }
    updates.no_wa = sanitizeForSheet(String(payload.no_wa).trim());
  }
  if (payload.telegram_chat_id !== undefined) {
    updates.telegram_chat_id = sanitizeForSheet(String(payload.telegram_chat_id).trim());
  }

  updates.updated_at = new Date().toISOString();
  updateRow('users', result.rowIndex, updates);

  logAudit(currentUser.email, 'update_user', { id: currentUser.id, action: 'update_profile' });

  const updated = findRowById('users', currentUser.id);
  return _sanitizeUserData(updated.data);
}

/**
 * Ganti password sendiri: verifikasi password lama dulu.
 * @param {string} passwordLama
 * @param {string} passwordBaru
 * @param {object} currentUser
 */
function changePassword(passwordLama, passwordBaru, currentUser) {
  validateRequired(passwordLama, 'Password lama');
  validateRequired(passwordBaru, 'Password baru');
  validateLength(passwordBaru, 8, 255, 'Password baru');

  // Ambil data user lengkap (dengan hash & salt) langsung dari sheet
  const result = findRowById('users', currentUser.id);
  if (!result) throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };

  const userData = result.data;
  if (!verifyPassword(passwordLama, userData.salt, userData.password_hash)) {
    throw { code: 'VALIDATION_ERROR', message: 'Password lama tidak sesuai' };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(passwordBaru, salt);

  updateRow('users', result.rowIndex, {
    salt: salt,
    password_hash: passwordHash,
    updated_at: new Date().toISOString()
  });

  logAudit(currentUser.email, 'update_user', { id: currentUser.id, action: 'change_password' });
}

/**
 * Ambil profil user saat ini.
 * @param {object} currentUser
 * @returns {object}
 */
function getMe(currentUser) {
  const result = findRowById('users', currentUser.id);
  if (!result) throw { code: 'NOT_FOUND', message: 'User tidak ditemukan' };
  return _sanitizeUserData(result.data);
}

/**
 * Hapus field sensitif dari data user.
 * @param {object} user
 * @returns {object}
 */
function _sanitizeUserData(user) {
  if (!user) return null;
  const { password_hash, salt, ...safe } = user;
  return safe;
}
