# SMLA — Sistem Manajemen Peminjaman Lab & Alat

Aplikasi web untuk mengelola peminjaman laboratorium dan alat di lingkungan akademik. Frontend statis di Cloudflare Pages, backend Google Apps Script (GAS) terhubung ke Google Sheets sebagai database, notifikasi via Email dan Telegram Bot.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vanilla JS (ES6), tanpa framework |
| Hosting | Cloudflare Pages |
| Backend | Google Apps Script (GAS) |
| Database | Google Sheets |
| Notifikasi Email | Gmail via GAS `MailApp` |
| Notifikasi Telegram | Telegram Bot API |

---

## Struktur Folder

```
.
├── gas/                        # Google Apps Script
│   ├── appsscript.json         # Manifest GAS
│   ├── Code.gs                 # Entry point: doGet/doPost, dispatcher
│   ├── Config.gs               # Konfigurasi dari PropertiesService
│   ├── Database.gs             # Generic CRUD ke Google Sheets
│   ├── Utils.gs                # UUID, hashing, utilitas tanggal
│   ├── Validation.gs           # Validasi dan sanitasi input
│   ├── Auth.gs                 # Login, logout, token, invalidasi
│   ├── AuthRBAC.gs             # Permission map, checkPermission
│   ├── Lab.gs                  # CRUD lab
│   ├── Alat.gs                 # CRUD alat, manajemen stok
│   ├── User.gs                 # CRUD user, reset/ganti password
│   ├── Peminjaman.gs           # Alur bisnis peminjaman
│   ├── LaporanKerusakan.gs     # Laporan kerusakan & kehilangan
│   ├── EmailService.gs         # Template dan kirim email
│   ├── TelegramService.gs      # Kirim notifikasi Telegram Bot
│   ├── ReminderTrigger.gs      # Trigger harian 16:00 WIB
│   ├── AuditLog.gs             # Pencatatan audit log
│   ├── Laporan.gs              # Statistik dan laporan
│   └── Setup.gs                # Setup awal sheet & secrets
│
├── src/                        # Frontend (Cloudflare Pages)
│   ├── index.html              # Entry point SPA
│   ├── _headers                # HTTP security headers Cloudflare
│   ├── _redirects              # SPA fallback routing
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css       # Design tokens
│   │   ├── components.css      # Button, badge, tabel, form, modal
│   │   ├── layout.css          # Sidebar, topbar, content area
│   │   └── responsive.css      # Mobile/tablet breakpoints
│   └── js/
│       ├── utils/              # format.js, validate.js, dom.js
│       ├── components/         # badge, toast, modal, table, form
│       ├── pages/              # 12 halaman (login, dashboard, dll)
│       ├── api.js              # HTTP client ke GAS
│       ├── auth.js             # Session localStorage, RBAC helper
│       ├── router.js           # Hash-based router, role guard
│       └── app.js              # Init, layout, registrasi route
│
├── docs/                       # Dokumentasi teknis
│   ├── 01-overview.md
│   ├── 02-features.md
│   ├── 03-api.md
│   ├── 04-database.md
│   ├── 05-logic-flow.md
│   ├── 06-ui-ux.md
│   └── 07-security.md
│
├── PLAN.md                     # Rencana implementasi awal
├── README.md                   # File ini
└── .gitignore
```

---

## Setup

### 1. Google Sheets

1. Buat Google Spreadsheet baru.
2. Catat **Spreadsheet ID** dari URL (bagian antara `/d/` dan `/edit`).
3. Sheet akan dibuat otomatis saat menjalankan `runFullSetup()` di GAS (lihat langkah 5).

### 2. Google Apps Script

1. Buka [script.google.com](https://script.google.com) → buat project baru.
2. Salin semua file dari folder `gas/` ke project GAS (gunakan `clasp push` atau salin manual).
3. Di editor GAS, buka **Project Settings** → centang **Show "appsscript.json" in editor**.
4. Pastikan `appsscript.json` sudah ter-upload.

### 3. Isi PropertiesService (Script Properties)

Di GAS editor: **Project Settings → Script Properties → Add script property**

| Key | Keterangan |
|-----|-----------|
| `SPREADSHEET_ID` | ID Google Spreadsheet database |
| `ADMIN_EMAIL` | Email admin untuk notifikasi error |
| `TELEGRAM_BOT_TOKEN` | Token bot dari [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID grup/channel admin Telegram |
| `APP_NAME` | Nama aplikasi (tampil di email), default "SMLA" |
| `max_loan_days` | Maksimal hari peminjaman, default `7` |

> Jangan pernah commit nilai-nilai ini. Simpan terpisah di password manager.

### 4. Setup Sheets & User Admin Pertama

Di GAS editor, jalankan fungsi berikut satu per satu via **Run**:

```
runFullSetup()
```

Fungsi ini akan:
- Membuat semua sheet yang diperlukan dengan header yang benar
- Memverifikasi struktur sheet

Setelah setup, buat user admin pertama via fungsi:

```
setupSecrets()
```

Atau buat manual langsung di sheet `users` dengan `role = admin` dan password yang sudah di-hash menggunakan `hashPassword()`.

### 5. Deploy GAS sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web App**.
3. **Execute as**: Me (akun Google pemilik spreadsheet).
4. **Who has access**: Anyone.
5. Klik **Deploy** → salin URL Web App.

### 6. Konfigurasi Frontend

Buka `src/index.html`, isi attribute `content` pada meta tag `gas-api-url`:

```html
<meta name="gas-api-url" content="https://script.google.com/macros/s/AKfyc.../exec" id="gas-api-url">
```

### 7. Setup Telegram Bot

1. Chat [@BotFather](https://t.me/BotFather) di Telegram → `/newbot` → ikuti instruksi.
2. Salin token bot ke Script Property `TELEGRAM_BOT_TOKEN`.
3. Tambahkan bot ke grup/channel admin Telegram.
4. Dapatkan Chat ID grup: kirim pesan di grup → buka `https://api.telegram.org/bot<TOKEN>/getUpdates` → catat `chat.id`.
5. Simpan Chat ID ke Script Property `TELEGRAM_ADMIN_CHAT_ID`.

### 8. Deploy ke Cloudflare Pages

1. Push folder `src/` ke repository Git (GitHub/GitLab).
2. Di [Cloudflare Pages](https://pages.cloudflare.com):
   - Hubungkan repository.
   - **Build command**: (kosong, atau bisa pakai `echo done`).
   - **Build output directory**: `src`.
3. Deploy — Cloudflare otomatis membaca `_headers` dan `_redirects`.

---

## Development Lokal

Tidak ada build step. Cukup serve folder `src/` dengan HTTP server apapun:

```bash
# Python
python -m http.server 8080 --directory src

# Node (npx)
npx serve src

# VS Code
# Install extension "Live Server" → klik kanan index.html → Open with Live Server
```

Buka `http://localhost:8080` di browser.

> Pastikan GAS URL sudah diisi di meta tag `gas-api-url` agar request API berhasil.

---

## Install Trigger Reminder 16:00 WIB

Trigger ini mengirim notifikasi Telegram ke admin untuk peminjaman yang belum dikembalikan di hari jatuh tempo.

Di GAS editor, jalankan fungsi berikut **sekali saja**:

```javascript
installDailyReminderTrigger()
```

Fungsi ini ada di `ReminderTrigger.gs`. Trigger akan terdaftar di **Triggers** (ikon jam di sidebar GAS) dan berjalan otomatis setiap hari pukul 16:00–17:00 WIB (09:00–10:00 UTC).

> Untuk mengecek trigger yang terpasang: di GAS editor klik ikon **Triggers** (jam weker) di sidebar kiri.

---

## Dokumentasi Lebih Lanjut

Lihat folder `docs/` untuk detail teknis:

- `docs/01-overview.md` — gambaran sistem
- `docs/02-features.md` — daftar fitur lengkap
- `docs/03-api.md` — semua endpoint/action API
- `docs/04-database.md` — struktur sheet Google Sheets
- `docs/05-logic-flow.md` — alur bisnis
- `docs/06-ui-ux.md` — panduan desain UI
- `docs/07-security.md` — model keamanan dan RBAC
