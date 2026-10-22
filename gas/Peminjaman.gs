/**
 * Peminjaman.gs
 * Logika bisnis inti: peminjaman, approval, reject, pengembalian.
 * File paling kompleks — urutan fungsi mengikuti alur bisnis.
 */

/**
 * Buat peminjaman baru.
 * @param {object} payload
 * @param {object} currentUser
 * @returns {object}
 */
function createPeminjaman(payload, currentUser) {
  const {
    tipe_peminjaman, id_item, jumlah,
    tanggal_pinjam, tanggal_kembali_rencana,
    keperluan, mata_kuliah, dosen_pembimbing
  } = payload;

  // Validasi field wajib
  validateRequired(tipe_peminjaman, 'Tipe peminjaman');
  validateRequired(id_item, 'ID item');
  validateRequired(tanggal_pinjam, 'Tanggal pinjam');
  validateRequired(tanggal_kembali_rencana, 'Tanggal kembali rencana');
  validateRequired(keperluan, 'Keperluan');
  validateEnum(tipe_peminjaman, ['lab', 'alat'], 'Tipe peminjaman');
  validateDate(tanggal_pinjam, 'Tanggal pinjam');
  validateDate(tanggal_kembali_rencana, 'Tanggal kembali rencana');
  validateLength(keperluan, 5, 500, 'Keperluan');

  // Validasi rentang tanggal
  const tglPinjam = new Date(tanggal_pinjam);
  const tglKembali = new Date(tanggal_kembali_rencana);
  if (tglKembali <= tglPinjam) {
    throw { code: 'VALIDATION_ERROR', message: 'Tanggal kembali harus setelah tanggal pinjam' };
  }

  const maxDays = parseInt(getConfig('max_loan_days') || 7, 10);
  if (daysBetween(tglPinjam, tglKembali) > maxDays) {
    throw { code: 'VALIDATION_ERROR', message: `Maksimal peminjaman adalah ${maxDays} hari` };
  }

  // Validasi jumlah untuk alat
  let jumlahInt = 1;
  if (tipe_peminjaman === 'alat') {
    validateRequired(jumlah, 'Jumlah');
    validatePositiveInt(jumlah, null, 'Jumlah');
    jumlahInt = parseInt(jumlah, 10);
  }

  // Cek item tersedia dan stok
  let namaItem = '';
  if (tipe_peminjaman === 'lab') {
    const labResult = findRowById('lab', id_item);
    if (!labResult) throw { code: 'NOT_FOUND', message: 'Lab tidak ditemukan' };
    const lab = labResult.data;
    if (lab.status !== 'tersedia') {
      throw { code: 'CONFLICT', message: `Lab tidak tersedia saat ini (status: ${lab.status})` };
    }
    namaItem = lab.nama_lab;
  } else {
    const alatResult = findRowById('alat', id_item);
    if (!alatResult) throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
    const alat = alatResult.data;
    if (alat.status !== 'tersedia') {
      throw { code: 'CONFLICT', message: `Alat tidak tersedia saat ini (status: ${alat.status})` };
    }
    const stok = parseInt(alat.stok, 10);
    if (stok <= 0) {
      throw { code: 'CONFLICT', message: 'Stok alat habis' };
    }
    if (jumlahInt > stok) {
      throw { code: 'CONFLICT', message: `Stok tidak mencukupi. Tersedia: ${stok}, diminta: ${jumlahInt}` };
    }
    namaItem = alat.nama_alat;
  }

  const now = new Date().toISOString();

  const peminjaman = {
    id: generateUUID(),
    id_peminjam: currentUser.id,
    nama_peminjam: sanitizeForSheet(currentUser.nama),
    email_peminjam: sanitizeForSheet(currentUser.email),
    no_wa_peminjam: sanitizeForSheet(currentUser.no_wa || ''),
    tipe_peminjaman: tipe_peminjaman,
    id_item: id_item,
    nama_item: sanitizeForSheet(namaItem),
    jumlah: jumlahInt,
    tanggal_pinjam: tanggal_pinjam,
    tanggal_kembali_rencana: tanggal_kembali_rencana,
    tanggal_kembali_actual: '',
    keperluan: sanitizeForSheet(String(keperluan).trim()),
    mata_kuliah: sanitizeForSheet(String(mata_kuliah || '').trim()),
    dosen_pembimbing: sanitizeForSheet(String(dosen_pembimbing || '').trim()),
    status: 'pending',
    approved_by: '',
    catatan_admin: '',
    created_at: now,
    updated_at: now
  };

  appendRow('peminjaman', peminjaman);

  logAudit(currentUser.email, 'create_peminjaman', {
    id: peminjaman.id,
    tipe: tipe_peminjaman,
    nama_item: namaItem
  });

  // Notifikasi (silent fail — tidak boleh crash)
  sendEmailKonfirmasiPeminjaman(peminjaman);
  sendTelegramPeminjamanBaru(peminjaman);

  return peminjaman;
}

/**
 * Ambil daftar peminjaman.
 * Admin/staff: semua, bisa filter. Mahasiswa/dosen: hanya milik sendiri.
 * @param {object} filters - { status?, tipe?, id_peminjam?, from?, to? }
 * @param {object} currentUser
 * @returns {object[]}
 */
function getPeminjaman(filters, currentUser) {
  const rows = getAllRows('peminjaman');
  const { status, tipe, id_peminjam, from, to } = filters || {};

  return rows.filter(row => {
    // Mahasiswa/dosen hanya bisa lihat milik sendiri
    if (!isAdminOrStaff(currentUser.role) && row.id_peminjam !== currentUser.id) return false;
    // Filter by id_peminjam (khusus admin/staff)
    if (isAdminOrStaff(currentUser.role) && id_peminjam && row.id_peminjam !== id_peminjam) return false;
    if (status && row.status !== status) return false;
    if (tipe && row.tipe_peminjaman !== tipe) return false;
    if (from && new Date(row.created_at) < new Date(from)) return false;
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(row.created_at) > toDate) return false;
    }
    return true;
  });
}

/**
 * Ambil detail 1 peminjaman berdasarkan id.
 * Admin/staff: boleh akses semua. Mahasiswa/dosen: hanya milik sendiri.
 * @param {string} id
 * @param {object} currentUser
 * @returns {object}
 */
function getPeminjamanById(id, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('peminjaman', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Peminjaman tidak ditemukan' };
  }

  const peminjaman = result.data;

  if (!isAdminOrStaff(currentUser.role) && peminjaman.id_peminjam !== currentUser.id) {
    throw { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke peminjaman ini' };
  }

  return peminjaman;
}

/**
 * Ambil peminjaman milik currentUser sendiri.
 * @param {object} filters - { status? }
 * @param {object} currentUser
 * @returns {object[]}
 */
function getMyPeminjaman(filters, currentUser) {
  const rows = getAllRows('peminjaman');
  const { status } = filters || {};

  return rows.filter(row => {
    if (row.id_peminjam !== currentUser.id) return false;
    if (status && row.status !== status) return false;
    return true;
  });
}

/**
 * Approve peminjaman.
 * @param {string} id
 * @param {string} catatan
 * @param {object} currentUser
 * @returns {object}
 */
function approvePeminjaman(id, catatan, currentUser) {
  validateUUID(id, 'id');

  const result = findRowById('peminjaman', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Peminjaman tidak ditemukan' };
  }

  const peminjaman = result.data;

  if (peminjaman.status !== 'pending') {
    throw {
      code: 'CONFLICT',
      message: `Hanya peminjaman berstatus 'pending' yang bisa disetujui (status saat ini: ${peminjaman.status})`
    };
  }

  // Jika tipe alat: cek ulang stok (guard race condition) lalu kurangi
  if (peminjaman.tipe_peminjaman === 'alat') {
    const alatCheck = findRowById('alat', peminjaman.id_item);
    if (!alatCheck) {
      throw { code: 'NOT_FOUND', message: 'Alat tidak ditemukan' };
    }
    const stokTersedia = parseInt(alatCheck.data.stok, 10);
    const jumlahDiminta = parseInt(peminjaman.jumlah, 10);
    if (stokTersedia < jumlahDiminta) {
      throw {
        code: 'CONFLICT',
        message: `Stok tidak mencukupi untuk approve. Tersedia: ${stokTersedia}, dibutuhkan: ${jumlahDiminta}`
      };
    }
    decrementStok(peminjaman.id_item, jumlahDiminta);
  }

  // Jika tipe lab: set status lab → 'dipinjam'
  if (peminjaman.tipe_peminjaman === 'lab') {
    const labResult = findRowById('lab', peminjaman.id_item);
    if (labResult) {
      updateRow('lab', labResult.rowIndex, { status: 'dipinjam', updated_at: new Date().toISOString() });
    }
  }

  const now = new Date().toISOString();
  updateRow('peminjaman', result.rowIndex, {
    status: 'approved',
    approved_by: currentUser.id,
    catatan_admin: sanitizeForSheet(String(catatan || '').trim()),
    updated_at: now
  });

  logAudit(currentUser.email, 'approve', { id, nama_item: peminjaman.nama_item });

  // Ambil data terbaru untuk response dan email
  const updated = findRowById('peminjaman', id).data;
  sendEmailApprove(updated);

  return updated;
}

/**
 * Reject peminjaman. Catatan wajib diisi.
 * @param {string} id
 * @param {string} catatan
 * @param {object} currentUser
 * @returns {object}
 */
function rejectPeminjaman(id, catatan, currentUser) {
  validateUUID(id, 'id');
  validateRequired(catatan, 'Catatan/alasan penolakan');
  validateLength(catatan, 5, 500, 'Catatan');

  const result = findRowById('peminjaman', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Peminjaman tidak ditemukan' };
  }

  const peminjaman = result.data;

  if (peminjaman.status !== 'pending') {
    throw {
      code: 'CONFLICT',
      message: `Hanya peminjaman berstatus 'pending' yang bisa ditolak (status saat ini: ${peminjaman.status})`
    };
  }

  // Stok TIDAK berubah saat reject
  const now = new Date().toISOString();
  updateRow('peminjaman', result.rowIndex, {
    status: 'rejected',
    catatan_admin: sanitizeForSheet(String(catatan).trim()),
    updated_at: now
  });

  logAudit(currentUser.email, 'reject', { id, catatan, nama_item: peminjaman.nama_item });

  const updated = findRowById('peminjaman', id).data;
  sendEmailReject(updated);

  return updated;
}

/**
 * Konfirmasi pengembalian item.
 * @param {string} id
 * @param {string} kondisi - 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang'
 * @param {string} catatan
 * @param {number} denda
 * @param {object} currentUser
 * @returns {object}
 */
function returnPeminjaman(id, kondisi, catatan, denda, currentUser) {
  validateUUID(id, 'id');
  validateRequired(kondisi, 'Kondisi');
  validateEnum(kondisi, ['baik', 'rusak_ringan', 'rusak_berat', 'hilang'], 'Kondisi');

  const result = findRowById('peminjaman', id);
  if (!result) {
    throw { code: 'NOT_FOUND', message: 'Peminjaman tidak ditemukan' };
  }

  const peminjaman = result.data;

  if (!['approved', 'overdue'].includes(peminjaman.status)) {
    throw {
      code: 'CONFLICT',
      message: `Hanya peminjaman berstatus 'approved' atau 'overdue' yang bisa dikembalikan (status saat ini: ${peminjaman.status})`
    };
  }

  const now = new Date().toISOString();
  const dendaInt = denda ? parseInt(denda, 10) : 0;

  // 1. Update status peminjaman
  updateRow('peminjaman', result.rowIndex, {
    status: 'returned',
    tanggal_kembali_actual: now,
    updated_at: now
  });

  // 2. Insert ke sheet pengembalian
  appendRow('pengembalian', {
    id: generateUUID(),
    id_peminjaman: id,
    tanggal_kembali: now,
    kondisi: kondisi,
    catatan: sanitizeForSheet(String(catatan || '').trim()),
    denda: dendaInt,
    returned_by: currentUser.id,
    created_at: now
  });

  // 3. Manajemen stok dan kondisi item
  if (peminjaman.tipe_peminjaman === 'alat') {
    const jumlah = parseInt(peminjaman.jumlah, 10);

    if (kondisi === 'hilang') {
      // TIDAK tambah stok — alat hilang
      // Kurangi stok_total
      const alatResult = findRowById('alat', peminjaman.id_item);
      if (alatResult) {
        const alat = alatResult.data;
        const newStokTotal = Math.max(0, parseInt(alat.stok_total, 10) - jumlah);
        const alatUpdates = {
          stok_total: newStokTotal,
          kondisi: 'rusak_berat', // alat hilang dianggap kondisi rusak berat
          updated_at: now
        };
        // Jika stok_total menjadi 0 → tidak_tersedia
        if (newStokTotal === 0) {
          alatUpdates.status = 'tidak_tersedia';
        }
        updateRow('alat', alatResult.rowIndex, alatUpdates);
      }
    } else {
      // Tambah stok kembali
      incrementStok(peminjaman.id_item, jumlah);

      // Update kondisi alat jika kondisi pengembalian lebih buruk
      if (kondisi !== 'baik') {
        const alatResult = findRowById('alat', peminjaman.id_item);
        if (alatResult) {
          const kondisiMap = { baik: 0, rusak_ringan: 1, rusak_berat: 2 };
          const currentKondisiScore = kondisiMap[alatResult.data.kondisi] || 0;
          const newKondisiScore = kondisiMap[kondisi] || 0;
          if (newKondisiScore > currentKondisiScore) {
            updateRow('alat', alatResult.rowIndex, { kondisi, updated_at: now });
          }
        }
      }
    }
  }

  // Jika tipe lab: reset status lab → 'tersedia'
  if (peminjaman.tipe_peminjaman === 'lab') {
    const labResult = findRowById('lab', peminjaman.id_item);
    if (labResult) {
      // Hanya reset ke tersedia jika kondisi baik; jika rusak/hilang biarkan admin update manual
      if (kondisi === 'baik') {
        updateRow('lab', labResult.rowIndex, { status: 'tersedia', updated_at: now });
      }
      // Jika kondisi rusak: biarkan status lab diupdate via laporan tindak lanjut
    }
  }

  // 4. Auto-create laporan kerusakan/kehilangan — berlaku untuk SEMUA tipe (lab dan alat)
  if (kondisi === 'rusak_ringan' || kondisi === 'rusak_berat') {
    createLaporanKerusakanOtomatis(peminjaman, kondisi, currentUser);
  } else if (kondisi === 'hilang') {
    createLaporanKehilanganOtomatis(peminjaman, currentUser);
  }

  // 5. Log audit
  logAudit(currentUser.email, 'return', {
    id,
    kondisi,
    denda: dendaInt,
    nama_item: peminjaman.nama_item
  });

  // 6. Kirim email ke peminjam
  const updatedPeminjaman = findRowById('peminjaman', id).data;
  sendEmailReturn(updatedPeminjaman, kondisi, dendaInt);

  return updatedPeminjaman;
}
