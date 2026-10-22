/**
 * AuditLog.gs
 * Pencatatan audit trail ke sheet log_audit.
 * Append-only — tidak ada delete.
 */

const VALID_AUDIT_ACTIONS = [
  'login', 'logout', 'login_failed', 'account_locked',
  'create_peminjaman', 'approve', 'reject', 'return',
  'create_lab', 'update_lab', 'delete_lab',
  'create_alat', 'update_alat', 'delete_alat',
  'create_user', 'update_user', 'delete_user',
  'create_laporan_kerusakan', 'update_tindak_lanjut', 'selesai_tindak_lanjut',
  'daily_reminder', 'overdue_update'
];

/**
 * Catat aksi ke sheet log_audit.
 * Fungsi ini tidak boleh throw — kegagalan logging tidak boleh crash request utama.
 * @param {string} userEmail
 * @param {string} aksi
 * @param {object|string} detail
 * @param {string} [ip]
 */
function logAudit(userEmail, aksi, detail, ip) {
  try {
    appendRow('log_audit', {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      user_email: userEmail || 'system',
      aksi: aksi,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}),
      ip_address: ip || ''
    });
  } catch (err) {
    // Logging gagal tidak boleh crash request — silent fail
    console.error('logAudit error:', err);
  }
}

/**
 * Ambil log audit dengan filter opsional.
 * @param {object} filters - { from?, to?, aksi?, user_email? }
 * @returns {object[]}
 */
function getAuditLog(filters) {
  const rows = getAllRows('log_audit');
  const { from, to, aksi, user_email } = filters || {};

  return rows.filter(row => {
    if (aksi && row.aksi !== aksi) return false;
    if (user_email && row.user_email !== user_email) return false;
    if (from) {
      const rowDate = new Date(row.timestamp);
      const fromDate = new Date(from);
      if (rowDate < fromDate) return false;
    }
    if (to) {
      const rowDate = new Date(row.timestamp);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (rowDate > toDate) return false;
    }
    return true;
  });
}
