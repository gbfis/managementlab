/**
 * ReminderTrigger.gs
 * Trigger otomatis harian jam 16:00 WIB untuk reminder pengembalian.
 * Timezone diatur di appsscript.json: "timeZone": "Asia/Jakarta"
 */

/**
 * Cek semua peminjaman approved dan kirim reminder/update overdue.
 * Dipanggil otomatis oleh trigger harian jam 16:00.
 */
function checkAndRemindReturns() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const semua = getAllRows('peminjaman');
  const approved = semua.filter(p => p.status === 'approved');

  approved.forEach(p => {
    try {
      const tgl = parseDate(p.tanggal_kembali_rencana);
      if (!tgl) return;
      tgl.setHours(0, 0, 0, 0);

      if (tgl >= today && tgl < tomorrow) {
        // Harus kembali HARI INI
        sendEmailReminderHariIni(p);
        sendTelegramReminderHariIni(p);
      } else if (tgl < today) {
        // Sudah lewat — update ke overdue
        const hariTerlambat = daysBetween(tgl, today);

        const result = findRowById('peminjaman', p.id);
        if (result) {
          updateRow('peminjaman', result.rowIndex, {
            status: 'overdue',
            updated_at: new Date().toISOString()
          });
        }

        logAudit('system', 'overdue_update', {
          id: p.id,
          hari_terlambat: hariTerlambat,
          nama_item: p.nama_item,
          nama_peminjam: p.nama_peminjam
        });

        sendEmailOverdue(p, hariTerlambat);
        sendTelegramOverdue(p, hariTerlambat);
      }
    } catch (err) {
      // Jangan crash iterasi lainnya karena satu peminjaman gagal diproses
      console.error(`checkAndRemindReturns error untuk peminjaman ${p.id}:`, err);
    }
  });

  logAudit('system', 'daily_reminder', {
    tanggal: today.toISOString(),
    jumlah_diproses: approved.length
  });
}

/**
 * Install trigger harian jam 16:00 WIB.
 * Idempotent: hapus trigger lama sebelum buat baru.
 * Jalankan sekali dari GAS editor.
 */
function installDailyReminderTrigger() {
  // Hapus trigger lama untuk hindari duplikat
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAndRemindReturns') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Buat trigger baru: setiap hari jam 16:00 WIB
  ScriptApp.newTrigger('checkAndRemindReturns')
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .create();

  console.log('Trigger harian checkAndRemindReturns berhasil dipasang (jam 16:00 WIB)');
}
