/**
 * badge.js — render badge status sebagai DOM element (aman dari XSS).
 */
const Badge = {
  /** Map status -> { label, class } */
  _map: {
    // Status peminjaman
    pending: { label: 'Menunggu', cls: 'badge-pending' },
    approved: { label: 'Disetujui', cls: 'badge-approved' },
    rejected: { label: 'Ditolak', cls: 'badge-rejected' },
    returned: { label: 'Dikembalikan', cls: 'badge-returned' },
    overdue: { label: 'Terlambat', cls: 'badge-overdue' },
    // Status item (lab/alat)
    tersedia: { label: 'Tersedia', cls: 'badge-success' },
    maintenance: { label: 'Maintenance', cls: 'badge-maintenance' },
    tidak_tersedia: { label: 'Tidak Tersedia', cls: 'badge-danger' },
    dipinjam: { label: 'Dipinjam', cls: 'badge-info' },
    // Kondisi item
    baik: { label: 'Baik', cls: 'badge-success' },
    rusak_ringan: { label: 'Rusak Ringan', cls: 'badge-warning' },
    rusak_berat: { label: 'Rusak Berat', cls: 'badge-danger' },
    hilang: { label: 'Hilang', cls: 'badge-danger' },
    // Status tindak lanjut
    menunggu: { label: 'Menunggu', cls: 'badge-pending' },
    dalam_proses: { label: 'Dalam Proses', cls: 'badge-info' },
    selesai: { label: 'Selesai', cls: 'badge-success' },
    diabaikan: { label: 'Diabaikan', cls: 'badge-neutral' },
    // Tipe laporan
    kerusakan: { label: 'Kerusakan', cls: 'badge-danger' },
    kehilangan: { label: 'Kehilangan', cls: 'badge-danger' },
    // Sumber laporan
    pengembalian: { label: 'Pengembalian', cls: 'badge-neutral' },
    mandiri: { label: 'Mandiri', cls: 'badge-info' },
    // Tingkat kerusakan
    ringan: { label: 'Ringan', cls: 'badge-warning' },
    sedang: { label: 'Sedang', cls: 'badge-warning' },
    berat: { label: 'Berat', cls: 'badge-danger' },
    // Role
    admin: { label: 'Admin', cls: 'badge-info' },
    staff: { label: 'Staff', cls: 'badge-info' },
    dosen: { label: 'Dosen', cls: 'badge-neutral' },
    mahasiswa: { label: 'Mahasiswa', cls: 'badge-neutral' },
    // Status user
    aktif: { label: 'Aktif', cls: 'badge-success' },
    nonaktif: { label: 'Nonaktif', cls: 'badge-neutral' },
    terkunci: { label: 'Terkunci', cls: 'badge-danger' },
    menunggu_verifikasi: { label: 'Menunggu Verifikasi', cls: 'badge-pending' }
  },

  /** Render <span class="badge ..."> dengan label Indonesia. */
  render(status) {
    if (!status) {
      return Dom.createElement('span', { class: 'badge badge-neutral', text: '-' });
    }
    const entry = this._map[status];
    const label = entry ? entry.label : String(status);
    const cls = entry ? entry.cls : 'badge-neutral';
    return Dom.createElement('span', { class: 'badge ' + cls, text: label });
  }
};
