/**
 * TelegramService.gs
 * Notifikasi Telegram ke admin channel via Bot API.
 * Semua fungsi tidak boleh throw — kegagalan Telegram tidak boleh crash request utama.
 */

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
  const jumlahInfo = peminjaman.tipe_peminjaman === 'alat' && peminjaman.jumlah > 1
    ? `\n📦 Jumlah: ${peminjaman.jumlah} unit`
    : '';

  const text = `📋 <b>PEMINJAMAN BARU</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${peminjaman.nama_peminjam}</b>
🏷️ Item: ${peminjaman.nama_item}${jumlahInfo}
📅 Pinjam: ${peminjaman.tanggal_pinjam}
📅 Kembali: ${peminjaman.tanggal_kembali_rencana}
📝 Keperluan: ${peminjaman.keperluan}
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
👤 Peminjam: <b>${peminjaman.nama_peminjam}</b>
🏷️ Item: ${peminjaman.nama_item}
📅 Kembali: ${peminjaman.tanggal_kembali_rencana}
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
👤 Peminjam: <b>${peminjaman.nama_peminjam}</b>
🏷️ Item: ${peminjaman.nama_item}
📅 Batas Kembali: ${peminjaman.tanggal_kembali_rencana}
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
  const text = `🚨 <b>OVERDUE — TERLAMBAT ${hariTerlambat} HARI</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 Peminjam: <b>${peminjaman.nama_peminjam}</b>
🏷️ Item: ${peminjaman.nama_item}
📅 Batas Kembali: ${peminjaman.tanggal_kembali_rencana}
⚠️ Terlambat: <b>${hariTerlambat} hari</b>
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
  const text = `🔧 <b>KERUSAKAN DILAPORKAN</b>
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: ${laporan.nama_item}
⚠️ Tingkat: ${laporan.tingkat_kerusakan}
📝 Keterangan: ${laporan.deskripsi}
${peminjaman ? `👤 Peminjam: ${peminjaman.nama_peminjam}` : ''}
${peminjaman ? `📋 Dari peminjaman: ${peminjaman.id}` : ''}
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
  const text = `🚨 <b>KEHILANGAN DILAPORKAN</b>
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: ${laporan.nama_item}
⚠️ Tingkat: Hilang
${peminjaman ? `📋 Dari peminjaman: ${peminjaman.id}` : ''}
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
📦 Item: ${laporan.nama_item}
⚠️ Tipe: ${tipeLabel} — ${tingkatLabel}
📝 Keterangan: ${laporan.deskripsi}
👤 Dilaporkan oleh: ${laporan.nama_pelapor} (${laporan.email_pelapor || '-'})
━━━━━━━━━━━━━━━━━━━━━━━
Status: <b>Menunggu Tindak Lanjut</b>`;

  sendTelegramMessage(text, null);
}
