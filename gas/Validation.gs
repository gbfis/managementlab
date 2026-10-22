/**
 * Validation.gs
 * Fungsi validasi dan sanitasi input untuk keamanan dan konsistensi data.
 */

/**
 * Cegah formula injection: jika string diawali =, +, -, @, tab, atau CR
 * → prefix dengan apostrophe agar Sheets memperlakukan sebagai teks.
 * WAJIB dipanggil untuk SETIAP nilai string sebelum ditulis ke sheet.
 * @param {*} value
 * @returns {*}
 */
function sanitizeForSheet(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value.trim())) return "'" + value;
  return value;
}

/**
 * Validasi format email.
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase()) && email.length <= 255;
}

/**
 * Validasi field wajib ada (tidak kosong, tidak hanya whitespace).
 * @param {*} value
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} wajib diisi` };
  }
}

/**
 * Validasi nilai ada di daftar yang diizinkan.
 * @param {*} value
 * @param {string[]} allowed
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw {
      code: 'VALIDATION_ERROR',
      message: `${fieldName} harus salah satu dari: ${allowed.join(', ')}`
    };
  }
}

/**
 * Validasi panjang string berada dalam range [min, max].
 * @param {string} value
 * @param {number} min
 * @param {number} max
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validateLength(value, min, max, fieldName) {
  const str = String(value || '').trim();
  if (str.length < min) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} minimal ${min} karakter` };
  }
  if (str.length > max) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} maksimal ${max} karakter` };
  }
}

/**
 * Validasi format tanggal.
 * @param {string} dateStr
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validateDate(dateStr, fieldName) {
  if (!dateStr) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} wajib diisi` };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} format tanggal tidak valid` };
  }
}

/**
 * Validasi bilangan bulat positif, tidak melebihi max (opsional).
 * Menggunakan Number() agar leading/trailing whitespace dan nilai non-integer ditolak.
 * @param {*} value
 * @param {number|null} max
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validatePositiveInt(value, max, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} harus bilangan bulat positif` };
  }
  if (max !== null && max !== undefined && n > max) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} tidak boleh melebihi ${max}` };
  }
}

/**
 * Validasi format UUID v4.
 * @param {string} value
 * @param {string} fieldName
 * @throws {{code: string, message: string}}
 */
function validateUUID(value, fieldName) {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!value || !re.test(String(value))) {
    throw { code: 'VALIDATION_ERROR', message: `${fieldName} format UUID tidak valid` };
  }
}

/**
 * Validasi nomor WA format Indonesia (08xx atau 628xx).
 * @param {string} value
 * @returns {boolean}
 */
function validateNoWa(value) {
  if (typeof value !== 'string') return false;
  return /^(\+62|62|0)[0-9]{8,13}$/.test(value.trim());
}
