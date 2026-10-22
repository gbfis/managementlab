/**
 * validate.js — validasi sisi klien.
 * Semua fungsi mengembalikan boolean (true = valid).
 */
const Validate = {
  email(val) {
    if (typeof val !== 'string') return false;
    const v = val.trim().toLowerCase();
    if (!v || v.length > 255) return false;
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v);
  },

  required(val) {
    if (val == null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  },

  minLength(val, n) {
    if (val == null) return false;
    return String(val).trim().length >= n;
  },

  maxLength(val, n) {
    if (val == null) return true;
    return String(val).trim().length <= n;
  },

  /** Tanggal tidak boleh di masa lalu (format YYYY-MM-DD). */
  dateNotPast(val) {
    if (!val) return false;
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  },

  /** Tanggal val harus setelah otherVal (format YYYY-MM-DD). */
  dateAfter(val, otherVal) {
    if (!val || !otherVal) return false;
    const a = new Date(val);
    const b = new Date(otherVal);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
    return a > b;
  },

  /** Bilangan bulat positif (>= 1). Jika max diberikan, cek <= max. */
  positiveInt(val, max) {
    const n = Number(val);
    if (!Number.isInteger(n)) return false;
    if (n < 1) return false;
    if (max != null && n > max) return false;
    return true;
  },

  /** Format nomor WhatsApp Indonesia: 08xx, 628xx, atau +628xx. */
  noWa(val) {
    if (typeof val !== 'string') return false;
    const v = val.trim().replace(/[\s-]/g, '');
    if (!v) return false;
    return /^(\+62|62|0)[0-9]{8,13}$/.test(v);
  },

  /** Password: minimal 8 karakter, mengandung huruf dan angka. */
  password(val) {
    if (typeof val !== 'string') return false;
    if (val.length < 8) return false;
    if (!/[a-zA-Z]/.test(val)) return false;
    if (!/[0-9]/.test(val)) return false;
    return true;
  },

  /** URL valid (http/https). */
  url(val) {
    if (typeof val !== 'string') return false;
    const v = val.trim();
    if (!v) return false;
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v);
  }
};
