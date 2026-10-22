# Overview & Tech Stack

> Dokumen ini berisi ringkasan sistem, user roles, tech stack, dan justifikasi pemilihan stack.

---

## Tujuan Sistem

Sistem Management Peminjaman Lab & Alat (SMLA) memungkinkan:
- Peminjam (mahasiswa/dosen/staf) mengajukan peminjaman ruang lab atau alat
- Admin lab menyetujui/menolak pengajuan
- Konfirmasi otomatis via email ke peminjam dan admin
- Backup notifikasi via Telegram bot ke channel admin + tombol wa.me untuk hubungi peminjam
- Pelacakan status peminjaman (pending → approved → returned / overdue)
- Laporan dan audit trail lengkap

---

## User Roles

| Role | Akses |
|------|-------|
| `admin` | Full access: kelola user, lab, alat, approve/reject, laporan, audit log |
| `staff` | Kelola lab, alat, approve/reject peminjaman, laporan |
| `mahasiswa` | Ajukan peminjaman, lihat status peminjaman sendiri |
| `dosen` | Ajukan peminjaman, lihat status peminjaman sendiri |

---

## Tech Stack

### Frontend — Cloudflare Pages
- **Hosting**: Static site + Pages Functions (edge runtime)
- **Framework**: Vanilla JS (tidak pakai framework berat)
- **Styling**: CSS murni dengan design system sendiri
- **Alasan**: Gratis, CDN global, deploy via git push, tidak ada server yang harus dikelola

### Backend — Google Apps Script (GAS)
- **Fungsi**: REST API via Web App deployment (`doGet` / `doPost`)
- **Database**: Google Sheets sebagai data store
- **Email**: `MailApp.sendEmail()` native GAS, tanpa SMTP tambahan
- **HTTP keluar**: `UrlFetchApp` untuk Telegram Bot API
- **Alasan**: Gratis, tidak perlu server, Sheets bisa diakses langsung oleh admin, audit-friendly

### Notifikasi
- **Email**: MailApp (GAS) → primary channel konfirmasi ke peminjam
- **Telegram Bot**: UrlFetchApp → notifikasi & backup ke admin channel
- **WhatsApp**: via tombol `wa.me` di pesan Telegram (admin klik → buka WA manual, tidak pakai API)

### Kenapa Tidak Pakai Framework Berat?
Sistem ini internal kampus/lab, skala sedang. SPA berat (Next.js, React+Redux) overkill. Pendekatan ini:
- **Cost**: $0 (semua layanan gratis)
- **Maintenance**: minimal, tidak ada server yang harus dijaga
- **Visibility**: admin bisa langsung lihat/edit data di Google Sheets
- **Deploy**: push ke git → Cloudflare auto-deploy
- **Bundle**: JS < 50KB gzipped, load cepat

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     USER BROWSER                        │
│  (Login, Dashboard, Form Peminjaman, Status, Laporan)    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              CLOUDFLARE PAGES (CDN/Edge)                │
│  ├── Static Assets (HTML/CSS/JS)                        │
│  └── Pages Functions (_middleware: CORS, security hdrs) │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (fetch + Bearer token)
                         ▼
┌─────────────────────────────────────────────────────────┐
│            GOOGLE APPS SCRIPT (Web App)                  │
│  ├── doGet()  → GET requests (list, read)               │
│  ├── doPost() → POST requests (create, update, delete)  │
│  ├── Auth layer (token validation + role check)         │
│  ├── Input validation + formula injection prevention    │
│  ├── Audit logging                                      │
│  ├── MailApp.sendEmail()  ────────► Gmail / User Email   │
│  └── UrlFetchApp.fetch()  ───────► Telegram Bot API     │
└────────────────────────┬────────────────────────────────┘
                         │ SpreadsheetApp
                         ▼
┌─────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (Database)                    │
│  ├── users      ├── lab          ├── alat               │
│  ├── peminjaman  ├── pengembalian ├── log_audit          │
│  └── config                                              │
└─────────────────────────────────────────────────────────┘
```

---

## Dokumen Terkait

- `02-database.md` → Skema semua sheet Google Sheets
- `03-api.md` → Desain endpoint GAS
- `04-features.md` → Fitur lengkap per role
- `05-logic-flow.md` → Alur logika bisnis dan reminder
- `06-ui-ux.md` → Desain tampilan, komponen, form
- `07-security.md` → Auth, RBAC, validasi, secrets
- `08-deployment.md` → Setup Cloudflare, GAS, Sheets, Telegram
- `09-testing.md` → Strategy testing dan test cases
