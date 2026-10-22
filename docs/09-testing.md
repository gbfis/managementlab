# Testing & QA

> Strategy testing, test cases, dan checklist QA sebelum go-live.

---

## Testing Strategy

| Level | Tool | Yang Diuji |
|-------|------|-----------|
| API (unit) | Postman / curl manual | Semua endpoint GAS: response format, validasi, error handling |
| Frontend | Manual + browser devtools | Setiap halaman, flow, state (loading/empty/error) |
| Integration | Manual E2E | Flow lengkap: login → peminjaman → approve → return → email → Telegram |
| Security | Manual checklist | Auth bypass, XSS, injection, token forgery, RBAC |
| Performance | Lighthouse | Target: 90+ semua kategori, bundle size, |
| Accessibility | axe DevTools + keyboard | WCAG AA: kontras, focus, screen reader |
| Responsive | Browser resize + DevTools | Mobile (360px), tablet (768px), desktop (1280px) |

---

## Test Cases Lengkap

### Auth & Session

| # | Skenario | Langkah | Expected |
|---|---------|---------|---------|
| A1 | Login berhasil | Email + password benar | Dapat token, redirect ke dashboard |
| A2 | Login gagal - password salah | Email benar, password salah | Error "Email atau password salah", counter login_attempt +1 |
| A3 | Login 5x salah | 5x password salah | Akun terkunci, pesan "Akun terkunci, hubungi admin" |
| A4 | Akun nonaktif | Login dengan akun status nonaktif | Error "Akun Anda dinonaktifkan" |
| A5 | Token expired | Tunggu 24 jam atau manual invalidate | Auto redirect ke login |
| A6 | Logout | Klik logout | Token dihapus, redirect ke login, back browser tidak masuk lagi |
| A7 | Admin unlock akun | Admin buka user yang terkunci → unlock | Status kembali aktif, bisa login |

---

### Peminjaman — Flow Utama

| # | Skenario | Langkah | Expected |
|---|---------|---------|---------|
| P1 | Buat peminjaman lab | Login mahasiswa → form → pilih lab → isi data → submit | Status pending, email konfirmasi ke peminjam, Telegram notif ke admin |
| P2 | Buat peminjaman alat | Login mahasiswa → form → pilih alat → isi jumlah → submit | Status pending, email konfirmasi, stok BELUM berkurang |
| P3 | Approve peminjaman | Admin → detail peminjaman pending → approve | Status approved, email ke peminjam, stok alat berkurang (untuk alat) |
| P4 | Reject peminjaman | Admin → reject → isi alasan | Status rejected, email ke peminjam beserta alasan, stok tidak berubah |
| P5 | Konfirmasi return | Admin → return → isi kondisi → submit | Status returned, stok alat bertambah, email konfirmasi ke peminjam |
| P6 | Return kondisi rusak | Admin → return → kondisi rusak_ringan → isi denda | Denda tercatat di pengembalian, kondisi alat diupdate, email berisi info denda |

---

### Peminjaman — Validasi Form

| # | Skenario | Expected |
|---|---------|---------|
| V1 | Tanggal kembali sebelum tanggal pinjam | Error: "Tanggal kembali harus setelah tanggal pinjam" |
| V2 | Tanggal pinjam di masa lalu | Error: "Tanggal pinjam tidak boleh di masa lalu" |
| V3 | Jumlah alat melebihi stok | Error: "Jumlah melebihi stok tersedia (stok: X unit)" |
| V4 | Keperluan terlalu pendek (< 10 char) | Error: "Keperluan minimal 10 karakter" |
| V5 | Pilih lab yang status maintenance | Lab tidak muncul di dropdown |
| V6 | Pilih alat stok 0 | Alat tidak muncul di dropdown |
| V7 | Form alat: field jumlah muncul | Pilih tipe alat → field jumlah muncul |
| V8 | Form lab: field jumlah tidak muncul | Pilih tipe lab → field jumlah hilang |
| V9 | Form mahasiswa: field mata kuliah muncul | Login sebagai mahasiswa → form → field mata kuliah & dosen pembimbing muncul |

---

### RBAC & Akses

| # | Skenario | Expected |
|---|---------|---------|
| R1 | Mahasiswa lihat peminjaman orang lain via API | Hanya dapat peminjaman sendiri |
| R2 | Mahasiswa akses endpoint approve via API | Error FORBIDDEN |
| R3 | Mahasiswa akses halaman /user | Redirect atau menu tidak tampil |
| R4 | Staff akses endpoint delete user | Error FORBIDDEN |
| R5 | Mahasiswa login → dashboard | Redirect ke dashboard peminjam (bukan admin) |
| R6 | Admin login → dashboard | Dashboard admin dengan statistik sistem |

---

### Reminder & Trigger

| # | Skenario | Expected |
|---|---------|---------|
| T1 | Trigger 16:00 — ada peminjaman jatuh tempo hari ini | Email reminder ke peminjam + Telegram alert ke admin dengan tombol wa.me |
| T2 | Trigger 16:00 — ada peminjaman sudah lewat tgl kembali | Status diupdate ke overdue + email peringatan ke peminjam + Telegram alert |
| T3 | Trigger 16:00 — tidak ada peminjaman terkait | Tidak ada email/Telegram dikirim, log tetap dicatat |
| T4 | Tombol wa.me di Telegram diklik | WhatsApp terbuka dengan nomor peminjam yang benar |
| T5 | Peminjam tanpa no_wa → tombol wa.me | Tombol wa.me tidak muncul, hanya tombol Email |
| T6 | Peminjaman di-return sebelum trigger | Trigger tidak kirim reminder untuk peminjaman yang sudah returned |

---

### Notifikasi

| # | Skenario | Expected |
|---|---------|---------|
| N1 | Buat peminjaman | Email konfirmasi masuk ke inbox peminjam dalam < 2 menit |
| N2 | Approve | Email "Disetujui" masuk ke inbox peminjam |
| N3 | Reject | Email "Ditolak" masuk ke inbox peminjam, berisi alasan |
| N4 | Return | Email "Pengembalian diterima" masuk ke inbox peminjam |
| N5 | Buat peminjaman lab | Telegram notif muncul di admin channel |
| N6 | Telegram API down | Operasi tetap sukses, error dicatat di log_audit |
| N7 | Email quota GAS habis | Graceful error, tidak crash, log error |

---

### Security

| # | Skenario | Expected |
|---|---------|---------|
| S1 | Input formula injection `=SUM(A1:A2)` di field keperluan | Disimpan sebagai teks (dengan prefix apostrophe), tidak dieksekusi Sheets |
| S2 | XSS attempt `<script>alert(1)</script>` di field nama | Tampil sebagai teks biasa, tidak dieksekusi browser |
| S3 | Token palsu/expired di header | Error UNAUTHORIZED |
| S4 | Request tanpa token ke endpoint yang butuh auth | Error UNAUTHORIZED |
| S5 | Rate limit: 60+ request dalam 1 menit | Error RATE_LIMITED untuk request ke-61+ |
| S6 | Password hash tidak return ke frontend | Response API tidak mengandung `password_hash` atau `salt` |
| S7 | CSP header aktif | Cek via browser devtools Network → response headers |

---

### UI/UX & Responsive

| # | Skenario | Expected |
|---|---------|---------|
| U1 | Mobile view (360px) | Layout single column, tidak ada elemen yang terpotong |
| U2 | Tablet view (768px) | Layout 2 kolom di beberapa section |
| U3 | Touch target | Semua tombol dan link ≥ 44×44px di mobile |
| U4 | Keyboard navigation | Bisa navigasi seluruh form dengan Tab, Enter, Esc |
| U5 | Focus indicator | Focus outline terlihat jelas di semua elemen interaktif |
| U6 | Empty state | Halaman peminjaman kosong menampilkan pesan yang berguna |
| U7 | Loading state | Tombol submit disabled + teks berubah selama request |
| U8 | Error state | Form error tampil di bawah field yang bersangkutan |
| U9 | Kontras warna | Cek via axe DevTools — tidak ada warning WCAG AA |

---

### Manajemen Lab & Alat

| # | Skenario | Expected |
|---|---------|---------|
| M1 | Admin tambah lab baru | Lab muncul di daftar, tersedia di dropdown form peminjaman |
| M2 | Admin ubah status lab ke maintenance | Lab tidak muncul di dropdown form peminjaman |
| M3 | Admin edit stok alat | Stok baru terrefleksi di dropdown form peminjaman |
| M4 | Admin tambah alat | Alat muncul di daftar, tersedia di form peminjaman |
| M5 | Stok alat = 0 setelah approve | Alat tidak muncul di dropdown form peminjaman (stok ≤ 0) |

---

### Pelaporan Kerusakan & Kehilangan

| # | Skenario | Expected |
|---|---------|---------|
| K1 | Return alat kondisi `rusak_ringan` | Laporan kerusakan otomatis dibuat, status `menunggu`, kondisi alat diupdate, Telegram alert ke admin |
| K2 | Return alat kondisi `rusak_berat` | Laporan kerusakan otomatis dibuat tingkat `berat`, kondisi alat diupdate ke `rusak_berat` |
| K3 | Return alat kondisi `hilang` | Laporan kehilangan otomatis dibuat, stok TIDAK bertambah, stok_total berkurang 1, Telegram alert + tombol wa.me |
| K4 | Return alat kondisi `baik` | Tidak ada laporan dibuat, stok bertambah normal |
| K5 | Admin buat laporan mandiri | Laporan tersimpan dengan sumber `mandiri`, id_peminjaman null, kondisi item diupdate, Telegram notif |
| K6 | Admin update tindak lanjut ke `dalam_proses` | Status laporan berubah, catatan tersimpan, log audit tercatat |
| K7 | Admin selesaikan tindak lanjut + pilih kembalikan kondisi | Status laporan → `selesai`, kondisi alat kembali ke `baik` |
| K8 | Admin diabaikan laporan tanpa alasan | Error: "Alasan wajib diisi untuk status diabaikan" |
| K9 | Alat hilang stok_total jadi 0 setelah laporan | Status alat → `tidak_tersedia`, tidak muncul di form peminjaman |
| K10 | Filter laporan berdasarkan status `menunggu` | Hanya tampil laporan dengan status_tindak_lanjut = menunggu |
| K11 | Dashboard admin: laporan aktif muncul di queue | Laporan status `menunggu` dan `dalam_proses` muncul di panel laporan aktif |

---

## Performance Checklist

Jalankan Lighthouse (Chrome DevTools → Lighthouse) di halaman utama:

- [ ] Performance: ≥ 90
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 90
- [ ] SEO: ≥ 80 (tidak prioritas tapi jangan di bawah ini)
- [ ] Bundle JS < 50KB gzipped
- [ ] CSS < 20KB gzipped
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s

---

## Bug Report Template

Kalau menemukan bug saat testing, catat dengan format:

```
**Judul**: [deskripsi singkat]
**Langkah reproduksi**:
1. ...
2. ...
**Expected**: ...
**Actual**: ...
**Role/user**: mahasiswa / admin / staff
**Environment**: browser, OS
**Screenshot**: (jika ada)
```
