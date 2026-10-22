/**
 * Alat.gs
 * CRUD untuk sheet 'alat' + manajemen stok.
 */

/**
 * Ambil semua alat, filter by status dan/atau id_lab.
 * @param {object} filters - { status?, id_lab? }
 * @returns {object[]}
 */
function getAlat(filters) {
  const rows = getAllRows('alat');
  const { status, id_lab } = filters || {};

  return rows.filter(r => {
    if (status && r.status !== status) return false;
    if (id_lab && r.id_lab !== id_lab) return false;
    return true;
  });
}

/**
 * Ambil 1 alat berdasarkan id.
 * @param {string} id
 * @returns {object}
 */
function getAlatById(id) {
  validateUUID(id, 'id');
  const result = findRowById('alat', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
  }
  return result.data;
}

/**
 * Buat alat baru.
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object}
 */
function createAlat(payload, currentUser) {
  const { nama_alat, kode_alat, id_lab, kategori, kondisi, stok, deskripsi } = payload;

  validateRequired(nama_alat, 'Nama alat');
  validateRequired(kode_alat, 'Kode alat');
  validateRequired(id_lab, 'ID Lab');
  validateRequired(kategori, 'Kategori');
  validateEnum(kondisi, ['baik', 'rusak_ringan', 'rusak_berat'], 'Kondisi');
  validatePositiveInt(stok, null, 'Stok');
  validateLength(nama_alat, 2, 100, 'Nama alat');
  validateLength(kode_alat, 1, 30, 'Kode alat');

  // Cek lab ada
  const labResult = findRowById('lab', id_lab);
  if (!labResult) {
    throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
  }

  // Cek kode_alat unik
  const existing = getAllRows('alat');
  const dupKode = existing.find(r => r.kode_alat === String(kode_alat).trim());
  if (dupKode) {
    throw { code: 'CONFLICT', message: 'Kode alat sudah digunakan' };
  }

  const stokInt = parseInt(stok, 10);
  const now = new Date().toISOString();

  const alat = {
    id: generateUUID(),
    nama_alat: sanitizeForSheet(String(nama_alat).trim()),
    kode_alat: sanitizeForSheet(String(kode_alat).trim().toUpperCase()),
    id_lab: id_lab,
    kategori: sanitizeForSheet(String(kategori).trim()),
    kondisi: kondisi,
    stok: stokInt,
    stok_total: stokInt,
    deskripsi: sanitizeForSheet(String(deskripsi || '').trim()),
    status: 'tersedia',
    created_at: now
  };

  appendRow('alat', alat);
  logAudit(currentUser.email, 'create_alat', { id: alat.id, nama_alat: alat.nama_alat });

  return alat;
}

/**
 * Update alat.
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object}
 */
function updateAlat(payload, currentUser) {
  const { id, ...fields } = payload;
  validateUUID(id, 'id');

  const result = findRowById('alat', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
  }

  const updates = {};

  if (fields.nama_alat !== undefined) {
    validateLength(fields.nama_alat, 2, 100, 'Nama alat');
    updates.nama_alat = sanitizeForSheet(String(fields.nama_alat).trim());
  }
  if (fields.kode_alat !== undefined) {
    validateLength(fields.kode_alat, 1, 30, 'Kode alat');
    const existing = getAllRows('alat');
    const dup = existing.find(r => r.kode_alat === String(fields.kode_alat).trim().toUpperCase() && r.id !== id);
    if (dup) throw { code: 'CONFLICT', message: 'Kode alat sudah digunakan' };
    updates.kode_alat = sanitizeForSheet(String(fields.kode_alat).trim().toUpperCase());
  }
  if (fields.id_lab !== undefined) {
    const labResult = findRowById('lab', fields.id_lab);
    if (!labResult) throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
    updates.id_lab = fields.id_lab;
  }
  if (fields.kategori !== undefined) {
    updates.kategori = sanitizeForSheet(String(fields.kategori).trim());
  }
  if (fields.kondisi !== undefined) {
    validateEnum(fields.kondisi, ['baik', 'rusak_ringan', 'rusak_berat'], 'Kondisi');
    updates.kondisi = fields.kondisi;
  }
  if (fields.stok !== undefined) {
    const stokInt = parseInt(fields.stok, 10);
    if (isNaN(stokInt) || stokInt < 0) {
      throw { code: 'VALIDATION_ERROR', message: 'Stok tidak boleh negatif' };
    }
    updates.stok = stokInt;
  }
  if (fields.stok_total !== undefined) {
    const stokTotalInt = parseInt(fields.stok_total, 10);
    if (isNaN(stokTotalInt) || stokTotalInt < 0) {
      throw { code: 'VALIDATION_ERROR', message: 'Stok total tidak boleh negatif' };
    }
    updates.stok_total = stokTotalInt;
  }
  if (fields.deskripsi !== undefined) {
    updates.deskripsi = sanitizeForSheet(String(fields.deskripsi).trim());
  }
  if (fields.status !== undefined) {
    validateEnum(fields.status, ['tersedia', 'dipinjam', 'maintenance', 'tidak_tersedia'], 'Status');
    updates.status = fields.status;
  }

  updates.updated_at = new Date().toISOString();
  updateRow('alat', result.rowIndex, updates);

  logAudit(currentUser.email, 'update_alat', { id, updates: Object.keys(updates) });

  const updated = findRowById('alat', id);
  return updated.data;
}

/**
 * Soft delete alat: ubah status ke 'maintenance'.
 * @param {string} id
 * @param {object} currentUser
 */
function deleteAlat(id, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('alat', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
  }

  updateRow('alat', result.rowIndex, {
    status: 'maintenance',
    updated_at: new Date().toISOString()
  });

  logAudit(currentUser.email, 'delete_alat', { id, nama_alat: result.data.nama_alat });
}

/**
 * Kurangi stok alat. Throw CONFLICT jika stok tidak mencukupi.
 * @param {string} id
 * @param {number} jumlah
 */
function decrementStok(id, jumlah) {
  const result = findRowById('alat', id);
  if (!result) throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };

  const currentStok = parseInt(result.data.stok, 10);
  const newStok = currentStok - jumlah;

  if (newStok < 0) {
    throw { code: 'CONFLICT', message: `Stok tidak mencukupi. Tersedia: ${currentStok}, diminta: ${jumlah}` };
  }

  updateRow('alat', result.rowIndex, {
    stok: newStok,
    updated_at: new Date().toISOString()
  });
}

/**
 * Tambah stok alat.
 * @param {string} id
 * @param {number} jumlah
 */
function incrementStok(id, jumlah) {
  const result = findRowById('alat', id);
  if (!result) throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };

  const currentStok = parseInt(result.data.stok, 10);
  updateRow('alat', result.rowIndex, {
    stok: currentStok + jumlah,
    updated_at: new Date().toISOString()
  });
}
