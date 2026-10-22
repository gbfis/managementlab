# Security

> Dokumen ini mencakup autentikasi, otorisasi, validasi input, manajemen secrets,
> dan semua aspek keamanan sistem SMLA.

---

## 1. Autentikasi

### Password Storage
- Tidak pernah simpan password plaintext
- Hash: `SHA-256(password + salt)` — salt berbeda per user (random 16 byte)
- Salt disimpan di kolom `salt` sheet `users`

### Session Token
- Generated saat login berhasil
- Format: `SHA-256(userId + timestamp + SESSION_SECRET)`
- `SESSION_SECRET` disimpan di GAS `PropertiesService` (tidak di sheet)
- Disimpan di GAS `PropertiesService` dengan key = token, value = `userId|expiryTimestamp`
- TTL: **24 jam**
- Setiap request: token divalidasi, user di-load, role dicek

### Brute Force Protection
- Login gagal → increment `login_attempt` di sheet `users`
- Setelah **5 kali gagal**: status user → `terkunci`, log audit
- Akun terkunci hanya bisa di-unlock oleh admin via dashboard
- Reset `login_attempt` ke 0 setelah login berhasil

### Token di Frontend
- Token disimpan di `localStorage` (bukan cookie — tidak perlu CSRF protection)
- Dikirim di header `Authorization: Bearer <token>` untuk POST
- Dikirim di query param `?token=` untuk GET (GAS batasan doGet headers)
- Saat logout: token dihapus dari `localStorage` + invalidate di GAS `PropertiesService`

---

## 2. Authorization (RBAC)

### Role Hierarchy
```
admin > staff > dosen = mahasiswa
```

### Permission Matrix

| Aksi | Admin | Staff | Dosen | Mahasiswa |
|------|-------|-------|-------|-----------|
| View lab/alat | ✓ | ✓ | ✓ | ✓ |
| Create peminjaman | ✓ | ✓ | ✓ | ✓ |
| View peminjaman sendiri | ✓ | ✓ | ✓ | ✓ |
| View semua peminjaman | ✓ | ✓ | ✗ | ✗ |
| Approve/reject | ✓ | ✓ | ✗ | ✗ |
| Konfirmasi return | ✓ | ✓ | ✗ | ✗ |
| CRUD lab | ✓ | ✓ | ✗ | ✗ |
| CRUD alat | ✓ | ✓ | ✗ | ✗ |
| View laporan | ✓ | ✓ | ✗ | ✗ |
| CRUD user | ✓ | ✗ | ✗ | ✗ |
| Unlock akun | ✓ | ✗ | ✗ | ✗ |
| Reset password user | ✓ | ✗ | ✗ | ✗ |
| View audit log | ✓ | ✗ | ✗ | ✗ |

### Implementasi di GAS
```javascript
var PERMISSIONS = {
  'getLabs':            ['admin', 'staff', 'dosen', 'mahasiswa'],
  'createPeminjaman':   ['admin', 'staff', 'dosen', 'mahasiswa'],
  'getPeminjaman':      ['admin', 'staff', 'dosen', 'mahasiswa'],  // filtered by role in logic
  'approvePeminjaman':  ['admin', 'staff'],
  'rejectPeminjaman':   ['admin', 'staff'],
  'returnPeminjaman':   ['admin', 'staff'],
  'createLab':          ['admin', 'staff'],
  'updateLab':          ['admin', 'staff'],
  'deleteLab':          ['admin'],
  'getUsers':           ['admin'],
  'createUser':         ['admin'],
  'getAuditLog':        ['admin'],
  // ...
};

function checkPermission(action, userRole) {
  var allowed = PERMISSIONS[action];
  if (!allowed || allowed.indexOf(userRole) === -1) {
    throw { code: 'FORBIDDEN', message: 'Anda tidak memiliki izin untuk aksi ini' };
  }
}
```

---

## 3. Input Validation

Validasi dilakukan di dua tempat:
- **Frontend**: immediate feedback saat user mengisi form (UX)
- **GAS (backend)**: validasi final yang tidak bisa di-bypass

### Aturan Validasi per Field

| Field | Aturan |
|-------|--------|
| Email | Regex format email, lowercase, max 255 char |
| Password | Min 8 karakter, kombinasi huruf + angka |
| Nama | Min 2, max 100 karakter, tidak boleh hanya whitespace |
| Tanggal | Valid date, cek range (tidak di masa lalu, tidak melebihi max_loan_days) |
| Enum fields | Whitelist — hanya terima value yang ada di daftar valid |
| Text fields | Trim whitespace, max length per field |
| Numbers | Parse ke number, range check (stok ≥ 0, jumlah ≤ stok, kapasitas > 0) |
| UUID fields | Validate format UUID v4 |
| No WA | Regex format nomor Indonesia (08xx atau 628xx) |

### Formula Injection Prevention
Google Sheets vulnerable terhadap formula injection jika input diawali `=`, `+`, `-`, `@`:

```javascript
function sanitizeForSheet(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@]/.test(value.trim())) {
    return "'" + value; // Prefix apostrophe — Sheets memperlakukan sebagai teks
  }
  return value;
}
```

Fungsi ini dipanggil untuk **setiap** nilai string sebelum ditulis ke sheet.

---

## 4. XSS Prevention

### Frontend
- **Tidak pernah** gunakan `innerHTML` untuk menampilkan data dari API
- Selalu gunakan `textContent` atau metode DOM yang aman
- Untuk HTML yang memang diperlukan: gunakan DOM builder, bukan string concatenation

```javascript
// ❌ JANGAN
cell.innerHTML = data.nama_peminjam;

// ✅ BENAR
cell.textContent = data.nama_peminjam;

// ✅ BENAR untuk struktur HTML
var span = document.createElement('span');
span.textContent = data.nama_peminjam;
cell.appendChild(span);
```

### CSP Header (via Cloudflare `_headers`)
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://script.google.com;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 5. CORS & Origin Control

- GAS Web App deployed "Who has access: Anyone" (karena tidak bisa set header auth di doGet/doPost)
- CORS dibatasi via logic di GAS: cek `e.parameter.origin` atau hanya accept request dengan token valid
- GAS URL disimpan sebagai **Cloudflare environment variable** (`GAS_API_URL`), tidak hardcode di JS
- Jika GAS URL bocor, attacker tetap perlu token valid untuk akses data

---

## 6. Secret Management

| Secret | Lokasi | Tidak Di |
|--------|--------|---------|
| `SESSION_SECRET` | GAS `PropertiesService` | Code, sheet, git |
| `TELEGRAM_BOT_TOKEN` | GAS `PropertiesService` | Code, sheet, git |
| `TELEGRAM_CHANNEL_ID` | GAS `PropertiesService` | Code, sheet, git |
| Session tokens | GAS `PropertiesService` | Sheet, localStorage server-side |
| `GAS_API_URL` | Cloudflare env variable | JS source code, git |
| Password | SHA-256 hash di sheet | Plaintext anywhere |

### Setup di GAS
```javascript
function setupSecrets() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    'SESSION_SECRET':        'random-string-64-chars',
    'TELEGRAM_BOT_TOKEN':    '123456:ABC-DEF...',
    'TELEGRAM_CHANNEL_ID':   '-100123456789'
  });
}
// Jalankan sekali, lalu hapus function ini dari kode
```

---

## 7. Rate Limiting

GAS menggunakan `CacheService` untuk track request count:

```javascript
function checkRateLimit(userEmail) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + userEmail;
  var count = parseInt(cache.get(key) || '0');

  if (count >= 60) {
    throw { code: 'RATE_LIMITED', message: 'Terlalu banyak request, coba lagi dalam 1 menit' };
  }

  cache.put(key, String(count + 1), 60); // Reset setiap 60 detik
}
```

**Limit login attempt terpisah:**
- 5 percobaan gagal per email → lock akun (disimpan di sheet, persistent)

---

## 8. Audit Logging

Setiap aksi penting dicatat di sheet `log_audit`:

```javascript
function logAudit(userEmail, aksi, detail) {
  var sheet = getSheet('log_audit');
  sheet.appendRow([
    generateUUID(),
    new Date().toISOString(),
    userEmail,
    aksi,
    JSON.stringify(detail),
    getCurrentIP()   // best effort dari e.parameter
  ]);
}
```

**Prinsip:**
- Append-only: tidak ada fungsi delete di log_audit
- `system` sebagai `user_email` untuk aksi otomatis (trigger 16:00)
- Detail berisi context cukup untuk debug/audit

---

## 9. Data Privacy

- Password hash — tidak pernah return ke frontend
- `salt` — tidak pernah return ke frontend
- Email peminjam: mahasiswa/dosen hanya bisa lihat milik sendiri
- No WA: digunakan untuk tombol wa.me di Telegram admin, tidak diekspos ke peminjam lain
- Google Sheet: di-share hanya ke akun Google yang berwenang (admin)
- Audit log di Telegram: tidak tampilkan password hash, token, atau data sensitif lainnya

---

## 10. Backup & Recovery

- **Google Sheets version history**: built-in, bisa rollback per cell
- **Audit log**: trail lengkap semua aksi untuk investigasi
- **Export manual**: admin bisa download sheet sebagai CSV/Excel sewaktu-waktu
- **GAS code backup**: sync via `clasp` ke repository git (tanpa secrets)

---

## Security Checklist

Sebelum go-live, verifikasi semua item ini:

- [ ] Semua secrets di GAS `PropertiesService`, tidak ada di code/sheet/git
- [ ] `GAS_API_URL` di Cloudflare env variable, tidak hardcode di JS
- [ ] Formula injection prevention aktif di semua write ke sheet
- [ ] XSS: tidak ada `innerHTML` dengan data dari API di frontend
- [ ] CSP header aktif di Cloudflare `_headers`
- [ ] Brute force: akun lock setelah 5 gagal, bisa di-unlock admin
- [ ] Rate limiting aktif
- [ ] Token expiry 24 jam ditest: token expired → auto logout
- [ ] RBAC: mahasiswa tidak bisa akses endpoint admin (test manual)
- [ ] Password hash — tidak ada endpoint yang return `password_hash` atau `salt`
- [ ] Audit log berfungsi di setiap aksi penting
