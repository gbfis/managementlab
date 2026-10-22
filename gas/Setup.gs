/**
 * Setup.gs
 * Inisialisasi Google Spreadsheet: buat semua sheet dengan header yang benar
 * jika belum ada. Jalankan sekali saat deployment awal.
 *
 * Urutan sheet sesuai docs/02-database.md.
 */

/**
 * Definisi semua sheet dan header-nya.
 */
const SHEET_DEFINITIONS = {
  users: [
    'id', 'nama', 'email', 'nip_nim', 'role', 'no_wa', 'telegram_chat_id',
    'password_hash', 'salt', 'login_attempt', 'status', 'created_at'
  ],
  lab: [
    'id', 'nama_lab', 'kode_lab', 'lokasi', 'kapasitas', 'deskripsi',
    'foto_url', 'status', 'created_at'
  ],
  alat: [
    'id', 'nama_alat', 'kode_alat', 'id_lab', 'kategori', 'kondisi',
    'stok', 'stok_total', 'deskripsi', 'status', 'created_at'
  ],
  peminjaman: [
    'id', 'id_peminjam', 'nama_peminjam', 'email_peminjam', 'no_wa_peminjam',
    'tipe_peminjaman', 'id_item', 'nama_item', 'jumlah',
    'tanggal_pinjam', 'tanggal_kembali_rencana', 'tanggal_kembali_actual',
    'keperluan', 'mata_kuliah', 'dosen_pembimbing',
    'status', 'approved_by', 'catatan_admin', 'created_at', 'updated_at'
  ],
  pengembalian: [
    'id', 'id_peminjaman', 'tanggal_kembali', 'kondisi', 'catatan',
    'denda', 'returned_by', 'created_at'
  ],
  laporan_kerusakan: [
    'id', 'tipe_item', 'id_item', 'nama_item', 'tipe_laporan', 'sumber',
    'id_peminjaman', 'id_pelapor', 'nama_pelapor', 'deskripsi', 'foto_url',
    'tingkat_kerusakan', 'estimasi_biaya', 'status_tindak_lanjut',
    'tindak_lanjut', 'diselesaikan_oleh', 'tanggal_selesai',
    'created_at', 'updated_at'
  ],
  log_audit: [
    'id', 'timestamp', 'user_email', 'aksi', 'detail', 'ip_address'
  ],
  config: [
    'key', 'value', 'keterangan'
  ]
};

/**
 * Nilai awal sheet config.
 */
const DEFAULT_CONFIG = [
  ['admin_email',    'admin@lab.ac.id',       'Email admin default untuk notifikasi'],
  ['max_loan_days',  '7',                      'Maksimal hari peminjaman'],
  ['denda_per_hari', '10000',                  'Denda keterlambatan per hari (rupiah)'],
  ['sistem_nama',    'SMLA - Lab Teknik',      'Nama sistem, muncul di email & UI']
];

/**
 * Buat semua sheet yang belum ada dan isi header row-nya.
 * Sheet yang sudah ada tidak disentuh.
 * Jalankan fungsi ini sekali saat deployment awal.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  Object.entries(SHEET_DEFINITIONS).forEach(([sheetName, headers]) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      // Bekukan baris header agar tidak ikut ter-scroll
      sheet.setFrozenRows(1);
      // Bold header row
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      results.push(`✅ Dibuat: ${sheetName} (${headers.length} kolom)`);
    } else {
      results.push(`⏭️ Sudah ada: ${sheetName}`);
    }
  });

  // Isi config default jika sheet config baru dibuat dan masih kosong
  const configSheet = ss.getSheetByName('config');
  if (configSheet && configSheet.getLastRow() <= 1) {
    DEFAULT_CONFIG.forEach(row => configSheet.appendRow(row));
    results.push('✅ Config default diisi');
  }

  Logger.log('Setup selesai:\n' + results.join('\n'));
  return results;
}

/**
 * Verifikasi semua sheet dan header sudah sesuai definisi.
 * Berguna untuk pengecekan setelah deployment.
 * @returns {object} { ok: boolean, issues: string[] }
 */
function verifySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];

  Object.entries(SHEET_DEFINITIONS).forEach(([sheetName, expectedHeaders]) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      issues.push(`❌ Sheet tidak ditemukan: ${sheetName}`);
      return;
    }

    if (sheet.getLastRow() === 0) {
      issues.push(`⚠️ Sheet kosong (tidak ada header): ${sheetName}`);
      return;
    }

    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    expectedHeaders.forEach((header, idx) => {
      if (actualHeaders[idx] !== header) {
        issues.push(`⚠️ ${sheetName}[${idx + 1}]: expected '${header}', got '${actualHeaders[idx]}'`);
      }
    });
  });

  const ok = issues.length === 0;
  Logger.log(ok ? '✅ Semua sheet valid' : 'Issues:\n' + issues.join('\n'));
  return { ok, issues };
}

/**
 * Setup script properties (secrets). Ganti nilai placeholder sebelum menjalankan.
 * Jalankan sekali, lalu hapus atau komentari nilai sensitif.
 * JANGAN commit nilai asli ke git.
 */
function setupSecrets() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'SESSION_SECRET':      'GANTI-DENGAN-STRING-RANDOM-64-KARAKTER',
    'TELEGRAM_BOT_TOKEN':  'GANTI-DENGAN-TOKEN-BOT-TELEGRAM',
    'TELEGRAM_CHANNEL_ID': 'GANTI-DENGAN-CHANNEL-ID-TELEGRAM'
  });
  Logger.log('Script properties tersimpan. Hapus nilai sensitif dari kode setelah dijalankan.');
}

/**
 * Jalankan semua setup sekaligus: sheet + trigger reminder harian.
 * Fungsi convenience untuk deployment pertama kali.
 */
function runFullSetup() {
  Logger.log('=== SMLA Full Setup ===');
  setupSheets();
  try {
    installDailyReminderTrigger();
    Logger.log('✅ Daily reminder trigger dipasang');
  } catch (e) {
    Logger.log('⚠️ Gagal pasang trigger: ' + e.message);
  }
  Logger.log('=== Setup selesai ===');
}
