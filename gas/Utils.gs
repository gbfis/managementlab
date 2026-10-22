/**
 * Utils.gs
 * Fungsi-fungsi utilitas umum.
 */

/**
 * Generate UUID v4 menggunakan Utilities.getUuid()
 * @returns {string}
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Format Date ke ISO 8601 string.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) return '';
  return date.toISOString();
}

/**
 * Hash password dengan SHA-256(password + salt), return hex string.
 * @param {string} password
 * @param {string} salt
 * @returns {string}
 */
function hashPassword(password, salt) {
  const combined = password + salt;
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    combined,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/**
 * Generate random 16-byte hex salt.
 * @returns {string}
 */
function generateSalt() {
  const bytes = Utilities.computeHmacSha256Signature(
    String(Math.random()),
    String(Date.now())
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, 32);
}

/**
 * Verifikasi password dengan salt dan hash yang tersimpan.
 * @param {string} password
 * @param {string} salt
 * @param {string} hash
 * @returns {boolean}
 */
function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

/**
 * Generate session token: SHA-256(userId + timestamp + SESSION_SECRET)
 * @param {string} userId
 * @returns {string}
 */
function generateToken(userId) {
  const secret = getSecret('SESSION_SECRET') || 'default-secret-change-me';
  const combined = userId + Date.now() + secret;
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    combined,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/**
 * Return string 'YYYY-MM-DD' dari Date object.
 * @param {Date} date
 * @returns {string}
 */
function getDateOnly(date) {
  if (!date || !(date instanceof Date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tambah n hari ke date, return Date baru.
 * @param {Date} date
 * @param {number} n
 * @returns {Date}
 */
function addDays(date, n) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + n);
  return result;
}

/**
 * Hitung selisih hari antara dua tanggal (positif jika date1 < date2).
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number}
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / 86400000);
}

/**
 * Extract IP dari GAS event parameter (best effort).
 * @param {object} e - GAS event parameter
 * @returns {string}
 */
function getCurrentIP(e) {
  if (!e) return '';
  return e.parameter && e.parameter.ip ? e.parameter.ip : '';
}

/**
 * Parse string tanggal menjadi Date object.
 * @param {string|Date} str
 * @returns {Date|null}
 */
function parseDate(str) {
  if (!str) return null;
  if (str instanceof Date) return str;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
