/**
 * TelegramService.gs
 * Notifikasi Telegram ke admin channel via Bot API.
 * Semua fungsi tidak boleh throw — kegagalan Telegram tidak boleh crash request utama.
 */

/**
 * Escape karakter HTML agar aman digunakan di parse_mode HTML Telegram.
 * Wajib dipanggil untuk SETIAP field user-controlled sebelum diinterpolasi ke template.
 * @param {*} value
 * @returns {string}
 */
function escapeTelegramHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Kirim pesan teks ke TELEGRAM_CHANNEL_ID.
 * @param {string} text - HTML-formatted text
 * @param {Array|null} inlineKeyboard - [[{text, url}, ...], ...] atau null
 */
function sendTelegramMessage(text, inlineKeyboard) {
  try {
    const token = getSecret('TELEGRAM_BOT_TOKEN');
    const chatId = getSecret('TELEGRAM_CHANNEL_ID');

    if (!token || !chatId) {
      console.error('TelegramService: TELEGRAM_BOT_TOKEN atau TELEGRAM_CHANNEL_ID belum diset');
      return;
    }

    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true // kegagalan Telegram tidak crash request utama
    });
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
  }
}

/**
 * Normalisasi nomor WA Indonesia: hilangkan non-digit, '0' depan → '62'.
 * @param {string} noWa
 * @returns {string}
 */
function normalizeNoWa(noWa) {
  if (!noWa) return '';
  const digits = String(noWa).replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits;
}

/**
 * Buat inline keyboard button untuk WhatsApp.
 * @param {string} namaPeminjam
 * @param {string} noWa
 * @returns {object|null}
 */
function buildWaButton(namaPeminjam, noWa) {
  if (!noWa) return null;
  const waNumber = normalizeNoWa(noWa);
  if (!waNumber) return null;
  return { text: `💬 WA ${namaPeminjam}`, url: `https://wa.me/${waNumber}` };
}

/**
 * Buat inline keyboard button untuk Email.
 * @param {string} namaPeminjam
 * @param {string} email
 * @returns {object}
 */
function buildEmailButton(namaPeminjam, email) {
  return { text: `✉️ Email ${namaPeminjam}`, url: `mailto:${email}` };
}

/**
 * Buat inline keyboard rows berisi tombol WA dan Email untuk peminjam.
 * @param {string} namaPeminjam
 * @param {string} noWa
 * @param {string} email
 * @returns {Array} inline_keyboard rows
 */
function buildContactButtons(namaPeminjam, noWa, email) {
  const buttons = [];
  const waBtn = buildWaButton(namaPeminjam, noWa);
  if (waBtn) buttons.push(waBtn);
  if (email) buttons.push(buildEmailButton(namaPeminjam, email));
  return buttons.length > 0 ? [buttons] : [];
}

/**
 * Notif peminjaman baru ke admin channel.
 * @param {object} peminjaman
 */
function sendTelegramPeminjamanBaru(peminjaman) {
  const nama = escapeTelegramHtml(peminjaman.nama_peminjam);
  const item = escapeTelegramHtml(peminjaman.nama_item);
  const keperluan = escapeTelegramHtml(peminjaman.keperluan);
  const jumlahInfo = peminjaman.tipe_peminjaman === 'alat' && peminjaman.jumlah > 1
    ? `\n📦 Jumlah: ${escapeTelegramHtml(peminjaman.jumlah)} unit`
    : '';

  const text = `📋 <b>PEMINJAMAN BARU</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${nama}</b>
🏷️ Item: ${item}${jumlahInfo}
📅 Pinjam: ${escapeTelegramHtml(peminjaman.tanggal_pinjam)}
📅 Kembali: ${escapeTelegramHtml(peminjaman.tanggal_kembali_rencana)}
📝 Keperluan: ${keperluan}
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Menunggu Persetujuan</b>`;

  sendTelegramMessage(text, null);
}

/**
 * Notif peminjaman disetujui ke admin channel.
 * @param {object} peminjaman
 */
function sendTelegramApproved(peminjaman) {
  const text = `✅ <b>PEMINJAMAN DISETUJUI</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${escapeTelegramHtml(peminjaman.nama_peminjam)}</b>
🏷️ Item: ${escapeTelegramHtml(peminjaman.nama_item)}
📅 Kembali: ${escapeTelegramHtml(peminjaman.tanggal_kembali_rencana)}
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Approved</b>`;

  sendTelegramMessage(text, null);
}

/**
 * Notif reminder pengembalian hari ini ke admin channel.
 * Menyertakan tombol WA dan email.
 * @param {object} peminjaman
 */
function sendTelegramReminderHariIni(peminjaman) {
  const text = `⏰ <b>HARUS KEMBALI HARI INI</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${escapeTelegramHtml(peminjaman.nama_peminjam)}</b>
🏷️ Item: ${escapeTelegramHtml(peminjaman.nama_item)}
📅 Batas Kembali: ${escapeTelegramHtml(peminjaman.tanggal_kembali_rencana)}
━━━━━━━━━━━━━━━━━━━━━━━
Hubungi peminjam untuk konfirmasi pengembalian.`;

  const keyboard = buildContactButtons(
    peminjaman.nama_peminjam,
    peminjaman.no_wa_peminjam,
    peminjaman.email_peminjam
  );

  sendTelegramMessage(text, keyboard);
}

/**
 * Notif overdue ke admin channel.
 * @param {object} peminjaman
 * @param {number} hariTerlambat
 */
function sendTelegramOverdue(peminjaman, hariTerlambat) {
  const text = `🚨 <b>OVERDUE — TERLAMBAT ${parseInt(hariTerlambat, 10)} HARI</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${escapeTelegramHtml(peminjaman.nama_peminjam)}</b>
🏷️ Item: ${escapeTelegramHtml(peminjaman.nama_item)}
📅 Batas Kembali: ${escapeTelegramHtml(peminjaman.tanggal_kembali_rencana)}
⚠️ Terlambat: <b>${parseInt(hariTerlambat, 10)} hari</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>SEGERA hubungi peminjam!</b>`;

  const keyboard = buildContactButtons(
    peminjaman.nama_peminjam,
    peminjaman.no_wa_peminjam,
    peminjaman.email_peminjam
  );

  sendTelegramMessage(text, keyboard);
}

/**
 * Notif laporan kerusakan dari pengembalian ke admin channel.
 * @param {object} laporan
 * @param {object} peminjaman
 */
function sendTelegramLaporanKerusakan(laporan, peminjaman) {
  const pemLine1 = peminjaman ? `\n👤 Peminjam: ${escapeTelegramHtml(peminjaman.nama_peminjam)}` : '';
  const pemLine2 = peminjaman ? `\n📋 Dari peminjaman: ${escapeTelegramHtml(peminjaman.id)}` : '';

  const text = `🔧 <b>KERUSAKAN DILAPORKAN</b>
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: ${escapeTelegramHtml(laporan.nama_item)}
⚠️ Tingkat: ${escapeTelegramHtml(laporan.tingkat_kerusakan)}
📝 Keterangan: ${escapeTelegramHtml(laporan.deskripsi)}${pemLine1}${pemLine2}
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Menunggu Tindak Lanjut</b>`;

  sendTelegramMessage(text, null);
}

/**
 * Notif laporan kehilangan dari pengembalian ke admin channel.
 * Menyertakan tombol WA peminjam.
 * @param {object} laporan
 * @param {object} peminjaman
 */
function sendTelegramLaporanKehilangan(laporan, peminjaman) {
  const pemLine = peminjaman ? `\n📋 Dari peminjaman: ${escapeTelegramHtml(peminjaman.id)}` : '';

  const text = `🚨 <b>KEHILANGAN DILAPORKAN</b>
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: ${escapeTelegramHtml(laporan.nama_item)}
⚠️ Tingkat: Hilang${pemLine}
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Menunggu Tindak Lanjut</b>`;

  const keyboard = peminjaman
    ? buildContactButtons(peminjaman.nama_peminjam, peminjaman.no_wa_peminjam, peminjaman.email_peminjam)
    : [];

  sendTelegramMessage(text, keyboard);
}

/**
 * Notif laporan mandiri (tanpa keterkaitan peminjaman) ke admin channel.
 * @param {object} laporan
 */
function sendTelegramLaporanMandiri(laporan) {
  const tipeLabel = laporan.tipe_laporan === 'kehilangan' ? 'Kehilangan' : 'Kerusakan';
  const tingkatLabel = laporan.tingkat_kerusakan || '-';

  const text = `📋 <b>LAPORAN MANDIRI</b>
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: ${escapeTelegramHtml(laporan.nama_item)}
⚠️ Tipe: ${escapeTelegramHtml(tipeLabel)} — ${escapeTelegramHtml(tingkatLabel)}
📝 Keterangan: ${escapeTelegramHtml(laporan.deskripsi)}
👤 Dilaporkan oleh: ${escapeTelegramHtml(laporan.nama_pelapor)} (${escapeTelegramHtml(laporan.email_pelapor || '-')})
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Menunggu Tindak Lanjut</b>`;

  sendTelegramMessage(text, null);
}
