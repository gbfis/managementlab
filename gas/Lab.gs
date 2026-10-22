/**
 * Lab.gs
 * CRUD untuk sheet 'lab'.
 */

/**
 * Ambil semua lab, filter by status jika ada.
 * @param {object} filters - { status? }
 * @returns {object[]}
 */
function getLabs(filters) {
  const rows = getAllRows('lab');
  const { status } = filters || {};
  if (status) {
    return rows.filter(r => r.status === status);
  }
  return rows;
}

/**
 * Ambil 1 lab berdasarkan id.
 * @param {string} id
 * @returns {object}
 * @throws {{code: string, message: string}}
 */
function getLab(id) {
  validateUUID(id, 'id');
  const result = findRowById('lab', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
  }
  return result.data;
}

/**
 * Buat lab baru.
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object} lab baru
 */
function createLab(payload, currentUser) {
  const { nama_lab, kode_lab, lokasi, kapasitas, deskripsi, foto_url } = payload;

  validateRequired(nama_lab, 'Nama lab');
  validateRequired(kode_lab, 'Kode lab');
  validateRequired(lokasi, 'Lokasi');
  validatePositiveInt(kapasitas, null, 'Kapasitas');
  validateLength(nama_lab, 2, 100, 'Nama lab');
  validateLength(kode_lab, 1, 20, 'Kode lab');

  // Cek kode_lab unik
  const existing = findRows('lab', {});
  const dupKode = existing.find(r => r.kode_lab === String(kode_lab).trim());
  if (dupKode) {
    throw { code: 'CONFLICT', message: 'Kode lab sudah digunakan' };
  }

  const now = new Date().toISOString();
  const lab = {
    id: generateUUID(),
    nama_lab: sanitizeForSheet(String(nama_lab).trim()),
    kode_lab: sanitizeForSheet(String(kode_lab).trim().toUpperCase()),
    lokasi: sanitizeForSheet(String(lokasi).trim()),
    kapasitas: parseInt(kapasitas, 10),
    deskripsi: sanitizeForSheet(String(deskripsi || '').trim()),
    foto_url: sanitizeForSheet(String(foto_url || '').trim()),
    status: 'tersedia',
    created_at: now
  };

  appendRow('lab', lab);
  logAudit(currentUser.email, 'create_lab', { id: lab.id, nama_lab: lab.nama_lab });

  return lab;
}

/**
 * Update lab. Hanya field yang ada di payload yang diupdate.
 * @param {object} payload - { id, nama_lab?, kode_lab?, lokasi?, kapasitas?, deskripsi?, foto_url?, status? }
 * @param {object} currentUser
 * @returns {object} lab updated
 */
function updateLab(payload, currentUser) {
  const { id, ...fields } = payload;
  validateUUID(id, 'id');

  const result = findRowById('lab', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
  }

  const updates = {};

  if (fields.nama_lab !== undefined) {
    validateLength(fields.nama_lab, 2, 100, 'Nama lab');
    updates.nama_lab = sanitizeForSheet(String(fields.nama_lab).trim());
  }
  if (fields.kode_lab !== undefined) {
    validateLength(fields.kode_lab, 1, 20, 'Kode lab');
    // Cek duplikat kode_lab (exclude diri sendiri)
    const existing = getAllRows('lab');
    const dup = existing.find(r => r.kode_lab === String(fields.kode_lab).trim().toUpperCase() && r.id !== id);
    if (dup) throw { code: 'CONFLICT', message: 'Kode lab sudah digunakan' };
    updates.kode_lab = sanitizeForSheet(String(fields.kode_lab).trim().toUpperCase());
  }
  if (fields.lokasi !== undefined) {
    updates.lokasi = sanitizeForSheet(String(fields.lokasi).trim());
  }
  if (fields.kapasitas !== undefined) {
    validatePositiveInt(fields.kapasitas, null, 'Kapasitas');
    updates.kapasitas = parseInt(fields.kapasitas, 10);
  }
  if (fields.deskripsi !== undefined) {
    updates.deskripsi = sanitizeForSheet(String(fields.deskripsi).trim());
  }
  if (fields.foto_url !== undefined) {
    updates.foto_url = sanitizeForSheet(String(fields.foto_url).trim());
  }
  if (fields.status !== undefined) {
    validateEnum(fields.status, ['tersedia', 'maintenance', 'tidak_tersedia'], 'Status');
    updates.status = fields.status;
  }

  updates.updated_at = new Date().toISOString();
  updateRow('lab', result.rowIndex, updates);

  logAudit(currentUser.email, 'update_lab', { id, updates: Object.keys(updates) });

  // Return updated data
  const updated = findRowById('lab', id);
  return updated.data;
}

/**
 * Soft delete lab: ubah status ke 'tidak_tersedia'.
 * @param {string} id
 * @param {object} currentUser
 */
function deleteLab(id, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('lab', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
  }

  updateRow('lab', result.rowIndex, {
    status: 'tidak_tersedia',
    updated_at: new Date().toISOString()
  });

  logAudit(currentUser.email, 'delete_lab', { id, nama_lab: result.data.nama_lab });
}
