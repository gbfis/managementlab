/**
 * EmailService.gs
 * Template HTML email dan fungsi pengiriman untuk setiap event.
 * Semua email dalam Bahasa Indonesia.
 */

/**
 * Escape karakter HTML untuk mencegah XSS di email template.
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Bangun HTML template email dengan header, konten, dan footer.
 * @param {string} judul
 * @param {string} konten - HTML string untuk isi email
 * @param {string} namaSistem
 * @returns {string}
 */
function buildEmailTemplate(judul, konten, namaSistem) {
  const sys = escapeHtml(namaSistem || 'SMLA');
  const jdl = escapeHtml(judul);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${jdl}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f7f8fa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .header { background: #1a365d; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.8; }
    .body { padding: 28px 32px; color: #1a202c; }
    .body h2 { font-size: 17px; margin: 0 0 16px; color: #1a365d; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .info-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 14px; }
    .info-table td:first-child { background: #f7f8fa; font-weight: 600; width: 40%; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-pending  { background: #fefcbf; color: #744210; }
    .badge-approved { background: #f0fff4; color: #22543d; }
    .badge-rejected { background: #fff5f5; color: #742a2a; }
    .badge-returned { background: #e2e8f0; color: #4a5568; }
    .badge-overdue  { background: #fff5f5; color: #742a2a; border: 1px solid #fc8181; }
    .callout { background: #ebf8ff; border-left: 4px solid #3182ce; border-radius: 4px; padding: 12px 16px; margin: 16px 0; font-size: 14px; }
    .callout-warning { background: #fffbeb; border-left-color: #d69e2e; }
    .callout-danger  { background: #fff5f5; border-left-color: #c53030; }
    .footer { background: #f7f8fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${sys}</h1>
      <p>Sistem Manajemen Peminjaman Lab &amp; Alat</p>
    </div>
    <div class="body">
      ${konten}
    </div>
    <div class="footer">
      Email ini dikirim otomatis oleh sistem ${sys}. Mohon tidak membalas email ini.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Kirim email konfirmasi pengajuan peminjaman ke peminjam.
 * @param {object} peminjaman
 * @param {string} [namaSistem]
 */
function sendEmailKonfirmasiPeminjaman(peminjaman, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const konten = `
    <h2>Pengajuan Peminjaman Diterima</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Pengajuan peminjaman Anda telah diterima dan sedang menunggu persetujuan admin.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Tipe</td><td>${escapeHtml(peminjaman.tipe_peminjaman)}</td></tr>
      ${peminjaman.jumlah > 1 ? `<tr><td>Jumlah</td><td>${escapeHtml(String(peminjaman.jumlah))}</td></tr>` : ''}
      <tr><td>Tanggal Pinjam</td><td>${escapeHtml(peminjaman.tanggal_pinjam)}</td></tr>
      <tr><td>Rencana Kembali</td><td>${escapeHtml(peminjaman.tanggal_kembali_rencana)}</td></tr>
      <tr><td>Keperluan</td><td>${escapeHtml(peminjaman.keperluan)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-pending">Menunggu Persetujuan</span></td></tr>
    </table>
    <div class="callout">
      Anda akan mendapatkan notifikasi email begitu pengajuan disetujui atau ditolak oleh admin.
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] Konfirmasi Pengajuan Peminjaman — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Konfirmasi Pengajuan', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailKonfirmasiPeminjaman error:', err);
  }
}

/**
 * Kirim email pemberitahuan peminjaman disetujui.
 * @param {object} peminjaman
 * @param {string} [namaSistem]
 */
function sendEmailApprove(peminjaman, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const catatan = peminjaman.catatan_admin
    ? `<div class="callout"><strong>Catatan admin:</strong> ${escapeHtml(peminjaman.catatan_admin)}</div>`
    : '';

  const konten = `
    <h2>Peminjaman Anda Disetujui</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Kabar baik! Peminjaman Anda telah disetujui.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Tipe</td><td>${escapeHtml(peminjaman.tipe_peminjaman)}</td></tr>
      ${peminjaman.jumlah > 1 ? `<tr><td>Jumlah</td><td>${escapeHtml(String(peminjaman.jumlah))}</td></tr>` : ''}
      <tr><td>Tanggal Pinjam</td><td>${escapeHtml(peminjaman.tanggal_pinjam)}</td></tr>
      <tr><td>Rencana Kembali</td><td>${escapeHtml(peminjaman.tanggal_kembali_rencana)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-approved">Disetujui</span></td></tr>
    </table>
    ${catatan}
    <p>Silakan ambil <strong>${escapeHtml(peminjaman.nama_item)}</strong> sesuai jadwal. Pastikan dikembalikan tepat waktu.</p>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] Peminjaman Disetujui — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Peminjaman Disetujui', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailApprove error:', err);
  }
}

/**
 * Kirim email pemberitahuan peminjaman ditolak.
 * @param {object} peminjaman
 * @param {string} [namaSistem]
 */
function sendEmailReject(peminjaman, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const konten = `
    <h2>Peminjaman Anda Ditolak</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Mohon maaf, pengajuan peminjaman Anda tidak dapat kami setujui saat ini.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Tipe</td><td>${escapeHtml(peminjaman.tipe_peminjaman)}</td></tr>
      <tr><td>Tanggal Pinjam</td><td>${escapeHtml(peminjaman.tanggal_pinjam)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-rejected">Ditolak</span></td></tr>
    </table>
    <div class="callout callout-warning">
      <strong>Alasan penolakan:</strong> ${escapeHtml(peminjaman.catatan_admin || 'Tidak ada keterangan')}
    </div>
    <p>Jika ada pertanyaan, silakan hubungi admin lab.</p>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] Peminjaman Ditolak — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Peminjaman Ditolak', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailReject error:', err);
  }
}

/**
 * Kirim email konfirmasi pengembalian ke peminjam.
 * @param {object} peminjaman
 * @param {string} kondisi
 * @param {number} denda
 * @param {string} [namaSistem]
 */
function sendEmailReturn(peminjaman, kondisi, denda, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const dendaStr = denda && denda > 0
    ? `Rp ${Number(denda).toLocaleString('id-ID')}`
    : 'Tidak ada denda';

  const kondisiMap = {
    baik: 'Baik',
    rusak_ringan: 'Rusak Ringan',
    rusak_berat: 'Rusak Berat',
    hilang: 'Hilang'
  };

  const kondisiLabel = kondisiMap[kondisi] || kondisi;
  const hasMasalah = kondisi !== 'baik';

  const konten = `
    <h2>Pengembalian Dikonfirmasi</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Pengembalian ${escapeHtml(peminjaman.nama_item)} telah dikonfirmasi oleh admin.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Kondisi Kembali</td><td><strong>${escapeHtml(kondisiLabel)}</strong></td></tr>
      <tr><td>Denda</td><td><strong>${escapeHtml(dendaStr)}</strong></td></tr>
      <tr><td>Tanggal Kembali</td><td>${escapeHtml(new Date().toLocaleDateString('id-ID'))}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-returned">Selesai</span></td></tr>
    </table>
    ${hasMasalah ? `<div class="callout callout-warning">Item dikembalikan dalam kondisi <strong>${escapeHtml(kondisiLabel)}</strong>. Admin akan menindaklanjuti sesuai prosedur yang berlaku.</div>` : ''}
    <p>Terima kasih telah menggunakan fasilitas lab. Sampai jumpa di kesempatan berikutnya!</p>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] Pengembalian Dikonfirmasi — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Konfirmasi Pengembalian', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailReturn error:', err);
  }
}

/**
 * Kirim email reminder (hari ini harus kembali).
 * @param {object} peminjaman
 * @param {string} [namaSistem]
 */
function sendEmailReminderHariIni(peminjaman, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const konten = `
    <h2>Pengingat: Kembalikan Hari Ini</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Ini adalah pengingat bahwa <strong>${escapeHtml(peminjaman.nama_item)}</strong> yang Anda pinjam harus dikembalikan <strong>hari ini</strong>.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Rencana Kembali</td><td>${escapeHtml(peminjaman.tanggal_kembali_rencana)}</td></tr>
    </table>
    <div class="callout callout-warning">
      Segera kembalikan item ke lab sebelum jam tutup. Keterlambatan akan dikenakan denda sesuai ketentuan.
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] ⏰ Pengingat Pengembalian Hari Ini — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Pengingat Pengembalian', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailReminderHariIni error:', err);
  }
}

/**
 * Kirim email peringatan keterlambatan pengembalian.
 * @param {object} peminjaman
 * @param {number} hariTerlambat
 * @param {string} [namaSistem]
 */
function sendEmailOverdue(peminjaman, hariTerlambat, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const dendaPerHari = parseInt(getConfig('denda_per_hari') || 0, 10);
  const estimasiDenda = dendaPerHari * hariTerlambat;

  const konten = `
    <h2>Peringatan: Keterlambatan Pengembalian</h2>
    <p>Halo <strong>${escapeHtml(peminjaman.nama_peminjam)}</strong>,</p>
    <p>Anda telah terlambat mengembalikan <strong>${escapeHtml(peminjaman.nama_item)}</strong>.</p>
    <table class="info-table">
      <tr><td>Item</td><td>${escapeHtml(peminjaman.nama_item)}</td></tr>
      <tr><td>Batas Kembali</td><td>${escapeHtml(peminjaman.tanggal_kembali_rencana)}</td></tr>
      <tr><td>Keterlambatan</td><td><strong>${escapeHtml(String(hariTerlambat))} hari</strong></td></tr>
      ${estimasiDenda > 0 ? `<tr><td>Estimasi Denda</td><td><strong>Rp ${estimasiDenda.toLocaleString('id-ID')}</strong></td></tr>` : ''}
    </table>
    <div class="callout callout-danger">
      <strong>Segera kembalikan item ini.</strong> Semakin lama terlambat, denda akan semakin besar. Hubungi admin jika ada kendala.
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: peminjaman.email_peminjam,
      subject: `[${sys}] 🚨 Terlambat ${hariTerlambat} Hari — ${peminjaman.nama_item}`,
      htmlBody: buildEmailTemplate('Peringatan Keterlambatan', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailOverdue error:', err);
  }
}

/**
 * Kirim email link reset password.
 * @param {object} user - data user (id, nama, email)
 * @param {string} resetUrl - URL lengkap berisi token
 * @param {string} [namaSistem]
 */
function sendEmailResetPassword(user, resetUrl, namaSistem) {
  const sys = namaSistem || getConfig('sistem_nama') || 'SMLA';
  const konten = `
    <h2>Reset Password</h2>
    <p>Halo <strong>${escapeHtml(user.nama)}</strong>,</p>
    <p>Kami menerima permintaan reset password untuk akun Anda di ${escapeHtml(sys)}.</p>
    <p>Klik tombol di bawah untuk membuat password baru:</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}"
         style="background:#1a365d;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Reset Password
      </a>
    </p>
    <p style="font-size:13px;color:#718096;">
      Atau salin link berikut ke browser Anda:<br>
      <a href="${resetUrl}" style="color:#1a365d;word-break:break-all;">${resetUrl}</a>
    </p>
    <div class="callout callout-warning">
      Link ini hanya berlaku selama <strong>1 jam</strong> dan hanya bisa digunakan sekali.
      Jika Anda tidak meminta reset password, abaikan email ini — akun Anda tetap aman.
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: user.email,
      subject: `[${sys}] Reset Password Akun Anda`,
      htmlBody: buildEmailTemplate('Reset Password', konten, sys),
      name: sys
    });
  } catch (err) {
    console.error('sendEmailResetPassword error:', err);
    // Lempar error agar caller tahu email gagal dikirim
    throw { code: 'SERVER_ERROR', message: 'Gagal mengirim email reset password. Coba lagi nanti.' };
  }
}
