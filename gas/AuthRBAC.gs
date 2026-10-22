/**
 * AuthRBAC.gs
 * Role-Based Access Control — permission map dan pengecekan izin.
 */

/**
 * Map action → array role yang diizinkan.
 * Berdasarkan docs/07-security.md dan docs/03-api.md.
 */
const PERMISSIONS = {
  // Auth
  'login':                    [],  // public
  'logout':                   ['admin', 'staff', 'dosen', 'mahasiswa'],
  'me':                       ['admin', 'staff', 'dosen', 'mahasiswa'],
  'updateProfile':            ['admin', 'staff', 'dosen', 'mahasiswa'],
  'changePassword':           ['admin', 'staff', 'dosen', 'mahasiswa'],
  'requestPasswordReset':     [],  // public — tidak butuh token
  'resetPasswordViaToken':    [],  // public — tidak butuh token
  'registerUser':             [],  // public — self-register

  // Lab
  'getLabs':            ['admin', 'staff', 'dosen', 'mahasiswa'],
  'getLab':             ['admin', 'staff', 'dosen', 'mahasiswa'],
  'createLab':          ['admin', 'staff'],
  'updateLab':          ['admin', 'staff'],
  'deleteLab':          ['admin'],

  // Alat
  'getAlat':            ['admin', 'staff', 'dosen', 'mahasiswa'],
  'getAlatById':        ['admin', 'staff', 'dosen', 'mahasiswa'],
  'createAlat':         ['admin', 'staff'],
  'updateAlat':         ['admin', 'staff'],
  'deleteAlat':         ['admin'],

  // Peminjaman
  'getPeminjaman':      ['admin', 'staff', 'dosen', 'mahasiswa'],
  'getPeminjamanById':  ['admin', 'staff', 'dosen', 'mahasiswa'],
  'getMyPeminjaman':    ['admin', 'staff', 'dosen', 'mahasiswa'],
  'createPeminjaman':   ['admin', 'staff', 'dosen', 'mahasiswa'],
  'approvePeminjaman':  ['admin', 'staff'],
  'rejectPeminjaman':   ['admin', 'staff'],
  'returnPeminjaman':   ['admin', 'staff'],

  // User Management
  'getUsers':           ['admin'],
  'getUserById':        ['admin'],
  'createUser':         ['admin'],
  'updateUser':         ['admin'],
  'resetPassword':      ['admin'],
  'unlockUser':         ['admin'],

  // Laporan Kerusakan
  'getLaporanKerusakan':    ['admin', 'staff'],
  'getLaporanKerusakanById': ['admin', 'staff'],
  'createLaporanKerusakan': ['admin', 'staff'],
  'updateTindakLanjut':     ['admin', 'staff'],
  'selesaikanTindakLanjut': ['admin', 'staff'],

  // Laporan & Statistik
  'getReportPeminjaman':  ['admin', 'staff'],
  'getReportAlat':        ['admin', 'staff'],
  'getReportOverdue':     ['admin', 'staff'],
  'getDashboardStats':    ['admin', 'staff'],
  'getAuditLog':          ['admin'],
};

/**
 * Cek apakah role diizinkan melakukan action.
 * @param {string} action
 * @param {string} userRole
 * @throws {{code: string, message: string}}
 */
function checkPermission(action, userRole) {
  const allowed = PERMISSIONS[action];
  if (allowed === undefined) {
    throw { code: 'NOT_FOUND', message: `Aksi '${action}' tidak dikenal` };
  }
  if (allowed.length > 0 && !allowed.includes(userRole)) {
    throw { code: 'FORBIDDEN', message: 'Anda tidak memiliki izin untuk aksi ini' };
  }
}

/**
 * Cek apakah role adalah admin atau staff.
 * @param {string} role
 * @returns {boolean}
 */
function isAdminOrStaff(role) {
  return role === 'admin' || role === 'staff';
}

/**
 * Validasi token dan return currentUser, atau throw UNAUTHORIZED.
 * @param {string} token
 * @returns {object} currentUser
 */
function requireAuth(token) {
  return getCurrentUser(token);
}
