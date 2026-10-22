# SMLA — Sistem Management Peminjaman Lab & Alat

> **Status**: Planning Phase
> **Stack**: Cloudflare Pages + Google Apps Script + Google Sheets + Email + Telegram Bot
> **Biaya**: $0 (semua layanan gratis)

---

## Dokumen

Dokumentasi dipecah per topik di folder `docs/`. Buka file yang relevan dengan pekerjaan yang sedang dilakukan.

| File | Isi | Kapan Dibuka |
|------|-----|-------------|
| [`docs/01-overview.md`](docs/01-overview.md) | Ringkasan sistem, user roles, tech stack, arsitektur | Orientasi awal, jelaskan sistem ke orang baru |
| [`docs/02-database.md`](docs/02-database.md) | Skema semua sheet Google Sheets, relasi, catatan | Tambah kolom baru, debug data |
| [`docs/03-api.md`](docs/03-api.md) | Daftar endpoint GAS, payload, response format | Tambah endpoint, debug API |
| [`docs/04-features.md`](docs/04-features.md) | Fitur lengkap per role, roadmap fitur masa depan | Tambah fitur baru, cek scope role |
| [`docs/05-logic-flow.md`](docs/05-logic-flow.md) | Alur bisnis peminjaman, reminder 16:00, stok alat | Debug alur, tambah logika baru |
| [`docs/06-ui-ux.md`](docs/06-ui-ux.md) | Design system, komponen, layout, anti-AI-slop | Buat/edit halaman, update desain |
| [`docs/07-security.md`](docs/07-security.md) | Auth, RBAC, validasi, secrets, audit log | Review keamanan, tambah endpoint baru |
| [`docs/08-deployment.md`](docs/08-deployment.md) | Setup Cloudflare, GAS, Sheets, Telegram, struktur folder | Setup awal, deploy ulang |
| [`docs/09-testing.md`](docs/09-testing.md) | Strategy testing, test cases, QA checklist | Sebelum go-live, setelah tambah fitur |

---

## Quick Start

1. Baca `01-overview.md` untuk gambaran besar
2. Setup environment: ikuti `08-deployment.md`
3. Mulai coding backend: lihat `03-api.md` + `05-logic-flow.md`
4. Mulai coding frontend: lihat `06-ui-ux.md` + `04-features.md`
5. Sebelum deploy: jalankan checklist di `07-security.md` + `09-testing.md`

---

## Fase Pengembangan

### Fase 0: Setup (1-2 hari)
- [ ] Google Spreadsheet: buat semua sheet + header row + isi config
- [ ] GAS project: bind ke spreadsheet, isi PropertiesService
- [ ] Telegram bot: buat bot, buat channel, dapatkan token + channel ID
- [ ] GAS: deploy sebagai Web App, catat URL
- [ ] Cloudflare Pages: connect repo, isi env variable `GAS_API_URL`

### Fase 1: Backend GAS (3-5 hari)
- [ ] `Code.gs`: dispatcher doGet/doPost
- [ ] `Auth.gs`: login, logout, token, brute force protection
- [ ] `AuthRBAC.gs`: permission matrix, role checking
- [ ] `Database.gs`: helper read/write/search sheet
- [ ] `Validation.gs`: input validation + formula injection prevention
- [ ] `Lab.gs`, `Alat.gs`, `User.gs`: CRUD
- [ ] `Peminjaman.gs`: create, approve, reject, return + business logic stok + **auto-create laporan kerusakan**
- [ ] `LaporanKerusakan.gs`: CRUD laporan + tindak lanjut + update kondisi item
- [ ] `AuditLog.gs`: append log
- [ ] `Config.gs`, `Utils.gs`: helpers
- [ ] Test semua endpoint via Postman/curl

### Fase 2: Frontend (5-7 hari)
- [ ] `index.html`: SPA shell
- [ ] `css/`: design system (variables, components, layout, responsive)
- [ ] `js/api.js`, `js/auth.js`, `js/router.js`: core
- [ ] Halaman login
- [ ] Dashboard admin (statistik, approval queue, overdue alert)
- [ ] Dashboard peminjam (peminjaman aktif, quick action)
- [ ] List & detail peminjaman (per role)
- [ ] Form peminjaman baru (dengan kondisi field per tipe/role)
- [ ] Modal approve/reject/return
- [ ] CRUD lab & alat (admin/staff)
- [ ] User management (admin)
- [ ] Halaman laporan kerusakan/kehilangan: list aktif, filter, detail, update tindak lanjut
- [ ] Form laporan mandiri
- [ ] Panel laporan aktif di dashboard admin (queue tindak lanjut)

### Fase 3: Notifikasi (2-3 hari)
- [ ] `EmailService.gs`: template + kirim di setiap event
- [ ] `TelegramService.gs`: send + inline keyboard (tombol wa.me) builder
- [ ] `ReminderTrigger.gs`: logic cek peminjaman + kirim reminder
- [ ] Install time-driven trigger 16:00
- [ ] Test: email terkirim di setiap event, Telegram terkirim, tombol wa.me berfungsi

### Fase 4: Security Hardening (2-3 hari)
- [ ] Brute force lock aktif
- [ ] Rate limiting aktif
- [ ] Formula injection prevention ditest
- [ ] XSS audit frontend (no innerHTML)
- [ ] CSP header aktif di Cloudflare
- [ ] Token expiry ditest
- [ ] RBAC ditest manual per role

### Fase 5: Polish & Deploy (2-3 hari)
- [ ] Responsive: mobile, tablet, desktop
- [ ] Aksesibilitas: keyboard nav, kontras, screen reader
- [ ] Empty state, loading state, error state di setiap halaman
- [ ] Lighthouse 90+ di semua kategori
- [ ] Bahasa Indonesia review
- [ ] Deploy production
- [ ] Test E2E di production
- [ ] Dokumentasi README cara pakai

**Estimasi: 15–23 hari kerja (1 orang)**
