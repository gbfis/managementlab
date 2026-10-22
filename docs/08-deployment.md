# Deployment Guide

> Step-by-step setup seluruh komponen sistem: Google Sheets, GAS, Telegram Bot,
> Cloudflare Pages, dan struktur folder project.

---

## Urutan Setup

```
1. Google Sheets → buat spreadsheet + struktur sheet
2. Google Apps Script → buat project, bind ke sheet
3. Telegram Bot → buat bot, buat channel, dapatkan IDs
4. GAS → isi PropertiesService dengan secrets
5. GAS → deploy sebagai Web App, catat URL
6. Cloudflare Pages → setup project, isi env variable
7. Git → push kode, Cloudflare auto-deploy
8. GAS → install time-driven trigger (reminder 16:00)
9. Test end-to-end
```

---

## 1. Google Sheets

1. Buat Google Spreadsheet baru di akun Google admin
2. Buat sheet (tab) dengan nama persis:
   - `users`
   - `lab`
   - `alat`
   - `peminjaman`
   - `pengembalian`
   - `log_audit`
   - `config`
3. Buat **header row** di setiap sheet (baris 1) sesuai kolom di `02-database.md`
4. Isi sheet `config` dengan nilai awal:

   | key | value |
   |-----|-------|
   | admin_email | email-admin@domain.com |
   | max_loan_days | 7 |
   | denda_per_hari | 10000 |
   | sistem_nama | SMLA - [Nama Lab] |

5. Set sharing: **Restricted** — hanya akun admin yang punya akses edit
6. Catat **Spreadsheet ID** dari URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

---

## 2. Google Apps Script

1. Buka Spreadsheet → menu **Extensions → Apps Script**
   - Ini membuat GAS project yang *bound* ke spreadsheet (otomatis punya akses ke sheet)
2. Ganti nama project: `SMLA Backend`
3. Copy semua file `.gs` dari folder `gas/` di project ini ke GAS editor
4. Simpan semua file

---

## 3. Telegram Bot Setup

### Buat Bot
1. Buka Telegram → cari `@BotFather`
2. Kirim `/newbot`
3. Ikuti instruksi: isi nama bot dan username bot (`smla_admin_bot` misalnya)
4. Simpan **bot token** yang diberikan: `123456789:ABCdefGHI...`

### Buat Channel/Grup Admin
1. Buat channel Telegram baru (private) untuk admin
2. Tambahkan bot sebagai **Admin** di channel
3. Dapatkan **chat ID** channel:
   - Kirim pesan apapun ke channel
   - Buka: `https://api.telegram.org/bot{TOKEN}/getUpdates`
   - Cari `"chat": {"id": -100XXXXXXXXX}` — itu adalah channel ID (biasanya negatif)

### Catatan
- Untuk grup biasa: chat ID bisa positif atau negatif
- Untuk channel: chat ID selalu negatif, diawali `-100`

---

## 4. GAS PropertiesService (Secrets)

1. Di GAS editor, buka **Project Settings → Script Properties**
2. Tambah properties berikut:

   | Property | Value |
   |---------|-------|
   | `SESSION_SECRET` | String random 64 karakter (generate sendiri) |
   | `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
   | `TELEGRAM_CHANNEL_ID` | Chat ID channel admin (mis. `-1001234567890`) |
   | `ADMIN_EMAIL` | Email admin untuk notifikasi internal |

3. Atau via kode (jalankan sekali, lalu hapus):
   ```javascript
   function setupSecrets() {
     PropertiesService.getScriptProperties().setProperties({
       'SESSION_SECRET':     'isi-random-string-panjang-di-sini',
       'TELEGRAM_BOT_TOKEN': 'isi-token-dari-botfather',
       'TELEGRAM_CHANNEL_ID': 'isi-channel-id'
     });
   }
   ```

---

## 5. Deploy GAS sebagai Web App

1. Di GAS editor → **Deploy → New deployment**
2. Pilih type: **Web app**
3. Konfigurasi:
   - **Description**: `SMLA API v1`
   - **Execute as**: `Me` (akun Google admin)
   - **Who has access**: `Anyone`
4. Klik **Deploy**
5. Authorize permissions yang diminta:
   - Send email as me
   - Connect to external services (untuk Telegram)
   - Access Google Sheets
6. Salin **Web App URL** — format: `https://script.google.com/macros/s/XXXX/exec`
7. Simpan URL ini untuk diisi di Cloudflare

**Penting setiap update kode GAS:**
- Deploy → **New deployment** (bukan edit existing) untuk mendapat versi baru
- Atau: Deploy → **Manage deployments → Edit** untuk update versi yang sama

---

## 6. Cloudflare Pages

### Setup Project
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Pages → Create a project → Connect to Git**
3. Pilih repository GitHub/GitLab
4. Konfigurasi build:
   - **Build command**: (kosongkan — static site, tidak perlu build)
   - **Build output directory**: `/src` (atau root `/` jika index.html di root)
5. **Save and Deploy**

### Environment Variables
1. Di Pages project → **Settings → Environment variables**
2. Tambah variable (Production + Preview):
   - `GAS_API_URL` = `https://script.google.com/macros/s/XXXX/exec`

### File Konfigurasi

**`_redirects`** (SPA fallback routing):
```
/*    /index.html   200
```

**`_headers`** (Security headers):
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://script.google.com
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 7. Install Time-Driven Trigger (Reminder 16:00)

Ini dilakukan **sekali** setelah GAS di-deploy:

1. Di GAS editor → buka file `ReminderTrigger.gs`
2. Jalankan function `installDailyReminderTrigger` (klik Run)
3. Authorize jika diminta
4. Verifikasi: **Triggers** (jam icon di sidebar kiri) → harus ada trigger:
   - Function: `checkAndRemindReturns`
   - Event source: Time-driven
   - Type: Day timer
   - Time: 4pm to 5pm (WIB)

**Penting**: Timezone GAS harus di-set ke `Asia/Jakarta` di `appsscript.json`:
```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

---

## 8. Sync GAS Code via Clasp (Opsional)

Untuk development workflow yang lebih baik (edit di lokal, push ke GAS):

```bash
# Install clasp
npm install -g @google/clasp

# Login ke Google
clasp login

# Clone project GAS yang sudah ada
clasp clone <script-id>
# Script ID ada di GAS editor: Project Settings → IDs

# Setelah edit file .gs di lokal, push ke GAS
clasp push

# Pull perubahan dari GAS ke lokal
clasp pull
```

**Catatan**: Secrets di `PropertiesService` tidak terpengaruh oleh push/pull clasp.

---

## 9. Struktur Folder Project

```
Management Lab System/
├── docs/                         # Dokumentasi (kamu sedang di sini)
│   ├── 01-overview.md
│   ├── 02-database.md
│   ├── 03-api.md
│   ├── 04-features.md
│   ├── 05-logic-flow.md
│   ├── 06-ui-ux.md
│   ├── 07-security.md
│   ├── 08-deployment.md          ← file ini
│   └── 09-testing.md
│
├── src/                          # Frontend (di-deploy ke Cloudflare Pages)
│   ├── index.html                # Entry point SPA
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css         # Design tokens
│   │   ├── components.css        # Button, table, badge, modal, toast, form
│   │   ├── layout.css            # Nav, sidebar, grid
│   │   └── responsive.css        # Media queries
│   ├── js/
│   │   ├── app.js                # Init, router
│   │   ├── api.js                # Fetch wrapper + auth token
│   │   ├── auth.js               # Login/logout, token storage
│   │   ├── router.js             # Hash-based routing + guards
│   │   ├── pages/
│   │   │   ├── login.js
│   │   │   ├── dashboard.js      # Berbeda per role
│   │   │   ├── peminjaman.js     # List (berbeda per role)
│   │   │   ├── peminjamanDetail.js
│   │   │   ├── peminjamanForm.js
│   │   │   ├── lab.js
│   │   │   ├── alat.js
│   │   │   ├── user.js           # Admin only
│   │   │   ├── laporan.js        # Admin/staff only
│   │   │   ├── pengembalian.js   # Admin/staff only
│   │   │   └── auditLog.js       # Admin only
│   │   ├── components/
│   │   │   ├── table.js
│   │   │   ├── modal.js
│   │   │   ├── badge.js
│   │   │   ├── toast.js
│   │   │   └── form.js
│   │   └── utils/
│   │       ├── format.js         # Tanggal (ID locale), angka, rupiah
│   │       ├── validate.js       # Client-side validation
│   │       └── dom.js            # DOM helpers (aman, no innerHTML)
│   └── assets/
│       ├── logo.svg
│       └── icons/
│
├── gas/                          # GAS source (push via clasp, tidak ke Cloudflare)
│   ├── appsscript.json           # Manifest (timezone, runtime)
│   ├── Code.gs                   # doGet/doPost dispatcher
│   ├── Auth.gs                   # Login, logout, token, session
│   ├── AuthRBAC.gs               # Role-based access control
│   ├── Peminjaman.gs             # Peminjaman CRUD + business logic
│   ├── Lab.gs                    # Lab CRUD
│   ├── Alat.gs                   # Alat CRUD
│   ├── User.gs                   # User CRUD
│   ├── EmailService.gs           # Template + send email
│   ├── TelegramService.gs        # Send Telegram + inline keyboard builder
│   ├── ReminderTrigger.gs        # Time-driven trigger: check + kirim reminder
│   ├── AuditLog.gs               # Append ke sheet log_audit
│   ├── Validation.gs             # Input validation + sanitize formula injection
│   ├── Database.gs               # Sheet helpers: read, write, search, update
│   ├── Utils.gs                  # UUID, date helpers, hash
│   └── Config.gs                 # Akses PropertiesService + sheet config
│
├── _headers                      # Cloudflare: security headers
├── _redirects                    # Cloudflare: SPA fallback
├── .gitignore
├── README.md
└── PLAN.md                       # Index dokumen
```

---

## Checklist Deployment

- [ ] Google Spreadsheet dibuat + semua sheet + header row
- [ ] Sheet `config` diisi nilai awal
- [ ] GAS project dibuat, bound ke spreadsheet
- [ ] Semua file `.gs` di-upload ke GAS editor
- [ ] PropertiesService diisi: SESSION_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
- [ ] GAS di-deploy sebagai Web App, URL disalin
- [ ] Telegram bot dibuat, ditambahkan sebagai admin di channel
- [ ] Channel ID didapatkan via getUpdates
- [ ] Cloudflare Pages project dibuat, connected ke git
- [ ] Environment variable `GAS_API_URL` diisi di Cloudflare
- [ ] File `_headers` dan `_redirects` ada di root project
- [ ] Time-driven trigger 16:00 diinstall dan terverifikasi di GAS Triggers
- [ ] Timezone GAS: `Asia/Jakarta` di `appsscript.json`
- [ ] Test end-to-end: login → buat peminjaman → approve → return → cek email + Telegram
