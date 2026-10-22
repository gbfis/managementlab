/**
 * LaporanKerusakan.gs
 * CRUD laporan kerusakan dan kehilangan item.
 */

/**
 * Ambil semua laporan dengan filter opsional.
 * @param {object} filters - { status_tindak_lanjut?, tipe_item?, tipe_laporan?, from?, to? }
 * @returns {object[]}
 */
function getLaporanKerusakan(filters) {
  const rows = getAllRows('laporan_kerusakan');
  const { status_tindak_lanjut, tipe_item, tipe_laporan, from, to } = filters || {};

  return rows.filter(row => {
    if (status_tindak_lanjut && row.status_tindak_lanjut !== status_tindak_lanjut) return false;
    if (tipe_item && row.tipe_item !== tipe_item) return false;
    if (tipe_laporan && row.tipe_laporan !== tipe_laporan) return false;
    if (from) {
      const rowDate = new Date(row.created_at);
      if (rowDate < new Date(from)) return false;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(row.created_at) > toDate) return false;
    }
    return true;
  });
}

/**
 * Ambil 1 laporan berdasarkan id.
 * @param {string} id
 * @returns {object}
 */
function getLaporanKerusakanById(id) {
  validateUUID(id, 'id');
  const result = findRowById('laporan_kerusakan', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' };
  }
  return result.data;
}

/**
 * Buat laporan kerusakan/kehilangan secara mandiri.
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object}
 */
function createLaporanKerusakan(payload, currentUser) {
  const {
    tipe_item, id_item, tipe_laporan, deskripsi,
    tingkat_kerusakan, estimasi_biaya, foto_url, id_peminjaman
  } = payload;

  validateRequired(tipe_item, 'Tipe item');
  validateRequired(id_item, 'ID item');
  validateRequired(tipe_laporan, 'Tipe laporan');
  validateRequired(deskripsi, 'Deskripsi');
  validateRequired(tingkat_kerusakan, 'Tingkat kerusakan');
  validateEnum(tipe_item, ['lab', 'alat'], 'Tipe item');
  validateEnum(tipe_laporan, ['kerusakan', 'kehilangan'], 'Tipe laporan');
  validateEnum(tingkat_kerusakan, ['ringan', 'sedang', 'berat', 'hilang'], 'Tingkat kerusakan');
  validateLength(deskripsi, 5, 1000, 'Deskripsi');

  // Ambil nama item
  let namaItem = '';
  if (tipe_item === 'lab') {
    const lab = findRowById('lab', id_item);
    if (!lab) throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
    namaItem = lab.data.nama_lab;
  } else {
    const alat = findRowById('alat', id_item);
    if (!alat) throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
    namaItem = alat.data.nama_alat;
  }

  const now = new Date().toISOString();

  const laporan = {
    id: generateUUID(),
    tipe_item: tipe_item,
    id_item: id_item,
    nama_item: sanitizeForSheet(namaItem),
    tipe_laporan: tipe_laporan,
    sumber: 'mandiri',
    id_peminjaman: id_peminjaman || '',
    id_pelapor: currentUser.id,
    nama_pelapor: sanitizeForSheet(currentUser.nama),
    deskripsi: sanitizeForSheet(String(deskripsi).trim()),
    foto_url: sanitizeForSheet(String(foto_url || '').trim()),
    tingkat_kerusakan: tingkat_kerusakan,
    estimasi_biaya: estimasi_biaya ? parseInt(estimasi_biaya, 10) : 0,
    status_tindak_lanjut: 'menunggu',
    tindak_lanjut: '',
    diselesaikan_oleh: '',
    tanggal_selesai: '',
    created_at: now,
    updated_at: now
  };

  appendRow('laporan_kerusakan', laporan);

  // Update kondisi/status item di sheet
  _updateItemKondisiDariLaporan(tipe_item, id_item, tipe_laporan, tingkat_kerusakan);

  logAudit(currentUser.email, 'create_laporan_kerusakan', {
    id: laporan.id,
    tipe_item,
    id_item,
    nama_item: namaItem
  });

  // Tambahkan email_pelapor ke laporan untuk Telegram
  laporan.email_pelapor = currentUser.email;
  sendTelegramLaporanMandiri(laporan);

  return laporan;
}

/**
 * Buat laporan kerusakan otomatis dari proses pengembalian.
 * Dipanggil oleh Peminjaman.gs — tidak perlu validasi manual.
 * @param {object} peminjaman
 * @param {string} kondisi - 'rusak_ringan' | 'rusak_berat'
 * @param {object} currentUser
 * @returns {object}
 */
function createLaporanKerusakanOtomatis(peminjaman, kondisi, currentUser) {
  const tingkat = kondisi === 'rusak_berat' ? 'berat' : 'ringan';
  const now = new Date().toISOString();

  const laporan = {
    id: generateUUID(),
    tipe_item: peminjaman.tipe_peminjaman,
    id_item: peminjaman.id_item,
    nama_item: sanitizeForSheet(peminjaman.nama_item),
    tipe_laporan: 'kerusakan',
    sumber: 'pengembalian',
    id_peminjaman: peminjaman.id,
    id_pelapor: currentUser.id,
    nama_pelapor: sanitizeForSheet(currentUser.nama),
    deskripsi: sanitizeForSheet(`Dikembalikan dengan kondisi ${kondisi} oleh ${peminjaman.nama_peminjam}`),
    foto_url: '',
    tingkat_kerusakan: tingkat,
    estimasi_biaya: 0,
    status_tindak_lanjut: 'menunggu',
    tindak_lanjut: '',
    diselesaikan_oleh: '',
    tanggal_selesai: '',
    created_at: now,
    updated_at: now
  };

  appendRow('laporan_kerusakan', laporan);
  sendTelegramLaporanKerusakan(laporan, peminjaman);

  return laporan;
}

/**
 * Buat laporan kehilangan otomatis dari proses pengembalian.
 * @param {object} peminjaman
 * @param {object} currentUser
 * @returns {object}
 */
function createLaporanKehilanganOtomatis(peminjaman, currentUser) {
  const now = new Date().toISOString();

  const laporan = {
    id: generateUUID(),
    tipe_item: peminjaman.tipe_peminjaman,
    id_item: peminjaman.id_item,
    nama_item: sanitizeForSheet(peminjaman.nama_item),
    tipe_laporan: 'kehilangan',
    sumber: 'pengembalian',
    id_peminjaman: peminjaman.id,
    id_pelapor: currentUser.id,
    nama_pelapor: sanitizeForSheet(currentUser.nama),
    deskripsi: sanitizeForSheet(`Item dilaporkan hilang oleh ${peminjaman.nama_peminjam}`),
    foto_url: '',
    tingkat_kerusakan: 'hilang',
    estimasi_biaya: 0,
    status_tindak_lanjut: 'menunggu',
    tindak_lanjut: '',
    diselesaikan_oleh: '',
    tanggal_selesai: '',
    created_at: now,
    updated_at: now
  };

  appendRow('laporan_kerusakan', laporan);
  sendTelegramLaporanKehilangan(laporan, peminjaman);

  return laporan;
}

/**
 * Update progress tindak lanjut laporan.
 * @param {string} id
 * @param {object} payload - { status_tindak_lanjut, tindak_lanjut, estimasi_biaya?, foto_url? }
 * @param {object} currentUser
 * @returns {object}
 */
function updateTindakLanjut(id, payload, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('laporan_kerusakan', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' };
  }

  const laporan = result.data;

  // Validasi transisi status
  const allowedStatus = ['menunggu', 'dalam_proses', 'selesai', 'diabaikan'];
  if (payload.status_tindak_lanjut) {
    validateEnum(payload.status_tindak_lanjut, allowedStatus, 'Status tindak lanjut');
  }

  const updates = { updated_at: new Date().toISOString() };

  if (payload.status_tindak_lanjut !== undefined) {
    updates.status_tindak_lanjut = payload.status_tindak_lanjut;
  }
  if (payload.tindak_lanjut !== undefined) {
    updates.tindak_lanjut = sanitizeForSheet(String(payload.tindak_lanjut).trim());
  }
  if (payload.estimasi_biaya !== undefined) {
    updates.estimasi_biaya = parseInt(payload.estimasi_biaya, 10) || 0;
  }
  if (payload.foto_url !== undefined) {
    updates.foto_url = sanitizeForSheet(String(payload.foto_url).trim());
  }

  updateRow('laporan_kerusakan', result.rowIndex, updates);

  logAudit(currentUser.email, 'update_tindak_lanjut', { id, updates: Object.keys(updates) });

  const updated = findRowById('laporan_kerusakan', id);
  return updated.data;
}

/**
 * Tandai tindak lanjut selesai.
 * @param {string} id
 * @param {object} payload - { tindak_lanjut, tanggal_selesai?, kembalikan_kondisi? }
 * @param {object} currentUser
 * @returns {object}
 */
function selesaikanTindakLanjut(id, payload, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('laporan_kerusakan', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' };
  }

  validateRequired(payload.tindak_lanjut, 'Keterangan penyelesaian');

  const laporan = result.data;
  const now = new Date().toISOString();
  const tanggalSelesai = payload.tanggal_selesai || getDateOnly(new Date());

  updateRow('laporan_kerusakan', result.rowIndex, {
    status_tindak_lanjut: 'selesai',
    tindak_lanjut: sanitizeForSheet(String(payload.tindak_lanjut).trim()),
    diselesaikan_oleh: currentUser.id,
    tanggal_selesai: tanggalSelesai,
    updated_at: now
  });

  // Jika admin pilih kembalikan kondisi item ke baik
  if (payload.kembalikan_kondisi) {
    if (laporan.tipe_item === 'alat') {
      const alatResult = findRowById('alat', laporan.id_item);
      if (alatResult) {
        const alatUpdates = { kondisi: 'baik', updated_at: now };
        // Jika alat hilang & sudah diganti: update stok_total
        if (laporan.tipe_laporan === 'kehilangan' && payload.stok_pengganti) {
          const currentStokTotal = parseInt(alatResult.data.stok_total, 10);
          alatUpdates.stok_total = currentStokTotal + parseInt(payload.stok_pengganti, 10);
          alatUpdates.stok = parseInt(alatResult.data.stok, 10) + parseInt(payload.stok_pengganti, 10);
          alatUpdates.status = 'tersedia';
        }
        updateRow('alat', alatResult.rowIndex, alatUpdates);
      }
    } else if (laporan.tipe_item === 'lab') {
      const labResult = findRowById('lab', laporan.id_item);
      if (labResult) {
        updateRow('lab', labResult.rowIndex, {
          status: 'tersedia',
          updated_at: now
        });
      }
    }
  }

  logAudit(currentUser.email, 'selesai_tindak_lanjut', { id, tanggal_selesai: tanggalSelesai });

  const updated = findRowById('laporan_kerusakan', id);
  return updated.data;
}

/**
 * Update kondisi/status item di sheet berdasarkan tipe laporan.
 * Dipanggil secara internal saat laporan mandiri dibuat.
 * @param {string} tipeItem
 * @param {string} idItem
 * @param {string} tipeLaporan
 * @param {string} tingkatKerusakan
 */
function _updateItemKondisiDariLaporan(tipeItem, idItem, tipeLaporan, tingkatKerusakan) {
  const now = new Date().toISOString();
  try {
    if (tipeItem === 'alat') {
      const result = findRowById('alat', idItem);
      if (!result) return;
      const updates = { updated_at: now };
      if (tipeLaporan === 'kehilangan') {
        updates.kondisi = 'rusak_berat';
      } else {
        if (tingkatKerusakan === 'berat') updates.kondisi = 'rusak_berat';
        else if (tingkatKerusakan === 'sedang' || tingkatKerusakan === 'ringan') updates.kondisi = 'rusak_ringan';
      }
      updateRow('alat', result.rowIndex, updates);
    } else if (tipeItem === 'lab') {
      const result = findRowById('lab', idItem);
      if (!result) return;
      if (tipeLaporan === 'kehilangan' || tingkatKerusakan === 'berat') {
        updateRow('lab', result.rowIndex, { status: 'tidak_tersedia', updated_at: now });
      } else {
        updateRow('lab', result.rowIndex, { status: 'maintenance', updated_at: now });
      }
    }
  } catch (err) {
    console.error('_updateItemKondisiDariLaporan error:', err);
  }
}
