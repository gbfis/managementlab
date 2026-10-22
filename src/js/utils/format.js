/**
 * format.js — utilitas format tampilan (Bahasa Indonesia).
 * Tidak ada innerHTML di file ini.
 */
const Format = {
  _bulanPendek: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  _bulanPanjang: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],

  _parseDate(val) {
    if (val == null || val === '') return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') return new Date(val);
    const str = String(val);
    // ISO dengan waktu
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    // Format YYYY-MM-DD (dianggap tanggal lokal)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return null;
  },

  _pad2(n) {
    return n < 10 ? '0' + n : String(n);
  },

  /** Format 'DD MMM YYYY' (mis. "22 Okt 2025"). */
  date(isoStr) {
    const d = this._parseDate(isoStr);
    if (!d) return '-';
    return `${d.getDate()} ${this._bulanPendek[d.getMonth()]} ${d.getFullYear()}`;
  },

  /** Format 'DD MMM YYYY HH:MM'. */
  dateTime(isoStr) {
    const d = this._parseDate(isoStr);
    if (!d) return '-';
    return `${d.getDate()} ${this._bulanPendek[d.getMonth()]} ${d.getFullYear()} ${this._pad2(d.getHours())}:${this._pad2(d.getMinutes())}`;
  },

  /** Format 'DD MMMM YYYY' dengan nama bulan panjang. */
  dateLong(isoStr) {
    const d = this._parseDate(isoStr);
    if (!d) return '-';
    return `${d.getDate()} ${this._bulanPanjang[d.getMonth()]} ${d.getFullYear()}`;
  },

  /** Tanggal relatif: 'hari ini', 'kemarin', 'N hari lalu', 'N hari lagi'. */
  relativeDate(isoStr) {
    const d = this._parseDate(isoStr);
    if (!d) return '-';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / 86400000);
    if (diffDays === 0) return 'hari ini';
    if (diffDays === 1) return 'besok';
    if (diffDays === -1) return 'kemarin';
    if (diffDays > 0) return `${diffDays} hari lagi`;
    return `${Math.abs(diffDays)} hari lalu`;
  },

  /** Format rupiah, mis. 10000 -> "Rp 10.000". */
  rupiah(number) {
    const n = Number(number);
    if (isNaN(n)) return 'Rp 0';
    return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  /** Mapping status peminjaman ke label Indonesia. */
  statusLabel(status) {
    const map = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      returned: 'Dikembalikan',
      overdue: 'Terlambat'
    };
    return map[status] || status || '-';
  },

  /** Mapping status item (lab/alat) ke label. */
  itemStatusLabel(status) {
    const map = {
      tersedia: 'Tersedia',
      maintenance: 'Maintenance',
      tidak_tersedia: 'Tidak Tersedia',
      dipinjam: 'Dipinjam'
    };
    return map[status] || status || '-';
  },

  /** Mapping kondisi item ke label. */
  kondisiLabel(kondisi) {
    const map = {
      baik: 'Baik',
      rusak_ringan: 'Rusak Ringan',
      rusak_berat: 'Rusak Berat',
      hilang: 'Hilang'
    };
    return map[kondisi] || kondisi || '-';
  },

  /** Mapping status tindak lanjut laporan ke label. */
  tindakLanjutLabel(status) {
    const map = {
      menunggu: 'Menunggu',
      dalam_proses: 'Dalam Proses',
      selesai: 'Selesai',
      diabaikan: 'Diabaikan'
    };
    return map[status] || status || '-';
  },

  /** Mapping role user ke label. */
  roleLabel(role) {
    const map = {
      admin: 'Admin',
      staff: 'Staff',
      dosen: 'Dosen',
      mahasiswa: 'Mahasiswa'
    };
    return map[role] || role || '-';
  },

  /** Mapping tipe laporan ke label. */
  tipeLaporanLabel(tipe) {
    const map = {
      kerusakan: 'Kerusakan',
      kehilangan: 'Kehilangan'
    };
    return map[tipe] || tipe || '-';
  },

  /** Mapping tingkat kerusakan ke label. */
  tingkatLabel(tingkat) {
    const map = {
      ringan: 'Ringan',
      sedang: 'Sedang',
      berat: 'Berat',
      hilang: 'Hilang'
    };
    return map[tingkat] || tingkat || '-';
  },

  /** Mapping sumber laporan ke label. */
  sumberLabel(sumber) {
    const map = {
      pengembalian: 'Pengembalian',
      mandiri: 'Mandiri'
    };
    return map[sumber] || sumber || '-';
  },

  /** Mapping status user ke label. */
  userStatusLabel(status) {
    const map = {
      aktif: 'Aktif',
      nonaktif: 'Nonaktif',
      terkunci: 'Terkunci'
    };
    return map[status] || status || '-';
  },

  /** Pretty-print JSON untuk detail audit log. */
  prettyJson(obj) {
    try {
      const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(obj);
    }
  }
};
