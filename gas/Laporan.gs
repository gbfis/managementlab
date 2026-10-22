/**
 * Laporan.gs
 * Laporan statistik dan dashboard.
 */

/**
 * Ringkasan statistik peminjaman dalam rentang periode.
 * @param {string} from - tanggal mulai (YYYY-MM-DD)
 * @param {string} to - tanggal akhir (YYYY-MM-DD)
 * @param {string} [tipe] - filter tipe peminjaman
 * @param {string} [status] - filter status
 * @returns {object}
 */
function getReportPeminjaman(from, to, tipe, status) {
  const rows = getAllRows('peminjaman');

  const filtered = rows.filter(row => {
    if (from && new Date(row.created_at) < new Date(from)) return false;
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(row.created_at) > toDate) return false;
    }
    if (tipe && row.tipe_peminjaman !== tipe) return false;
    if (status && row.status !== status) return false;
    return true;
  });

  // Ringkasan per status
  const byStatus = {};
  filtered.forEach(row => {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  });

  // Ringkasan per tipe
  const byTipe = {};
  filtered.forEach(row => {
    byTipe[row.tipe_peminjaman] = (byTipe[row.tipe_peminjaman] || 0) + 1;
  });

  // Total denda: baca dari sheet pengembalian untuk peminjaman yang ada di filtered
  const filteredIds = new Set(filtered.map(row => row.id));
  const pengembalianRows = getAllRows('pengembalian');
  const totalDenda = pengembalianRows.reduce((sum, row) => {
    if (filteredIds.has(row.id_peminjaman)) {
      return sum + (parseInt(row.denda, 10) || 0);
    }
    return sum;
  }, 0);

  return {
    periode: { from: from || null, to: to || null },
    total: filtered.length,
    by_status: byStatus,
    by_tipe: byTipe,
    total_denda: totalDenda,
    data: filtered
  };
}

/**
 * Status semua alat saat ini (ringkasan per status & kondisi).
 * @returns {object}
 */
function getReportAlat() {
  const rows = getAllRows('alat');

  const byStatus = {};
  const byKondisi = {};

  rows.forEach(row => {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    byKondisi[row.kondisi] = (byKondisi[row.kondisi] || 0) + 1;
  });

  return {
    total: rows.length,
    by_status: byStatus,
    by_kondisi: byKondisi,
    data: rows
  };
}

/**
 * List peminjaman yang berstatus overdue saat ini.
 * @returns {object[]}
 */
function getReportOverdue() {
  const rows = getAllRows('peminjaman');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter(row => {
    if (row.status !== 'overdue') return false;
    return true;
  }).map(row => {
    const tgl = parseDate(row.tanggal_kembali_rencana);
    const hariTerlambat = tgl ? daysBetween(tgl, today) : 0;
    return { ...row, hari_terlambat: hariTerlambat };
  });
}

/**
 * Statistik dashboard ringkas.
 * @returns {object}
 */
function getDashboardStats() {
  const peminjaman = getAllRows('peminjaman');
  const lab = getAllRows('lab');
  const alat = getAllRows('alat');
  const laporan = getAllRows('laporan_kerusakan');

  return {
    totalAktif: peminjaman.filter(p => p.status === 'approved').length,
    totalPending: peminjaman.filter(p => p.status === 'pending').length,
    totalOverdue: peminjaman.filter(p => p.status === 'overdue').length,
    labTersedia: lab.filter(l => l.status === 'tersedia').length,
    alatTersedia: alat.filter(a => a.status === 'tersedia' && parseInt(a.stok, 10) > 0).length,
    laporanAktif: laporan.filter(l =>
      l.status_tindak_lanjut === 'menunggu' || l.status_tindak_lanjut === 'dalam_proses'
    ).length
  };
}
