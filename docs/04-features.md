# Fitur Sistem — Per Role

> Dokumen ini merinci fitur lengkap sistem, dibagi berdasarkan role user.
> Untuk menambah fitur baru, dokumen ini yang pertama diupdate.

---

## Fitur Bersama (Semua Role)

- Login dengan email + password
- Logout
- Edit profil sendiri: nama, no_wa, telegram_chat_id
- Ganti password sendiri
- Lihat daftar lab (ketersediaan, lokasi, kapasitas)
- Lihat daftar alat (ketersediaan, kategori, kondisi, stok)

---

## Fitur Peminjam (Mahasiswa & Dosen)

### Peminjaman
- Ajukan peminjaman baru (lab atau alat)
- Lihat daftar peminjaman sendiri (filter: semua, pending, aktif, selesai)
- Lihat detail peminjaman sendiri (status, catatan admin, tanggal)
- Tidak bisa melihat peminjaman milik orang lain

### Form Peminjaman — Field yang Diisi

| # | Field | Tipe | Wajib? | Kondisi Tampil | Validasi |
|---|-------|------|--------|---------------|----------|
| 1 | Tipe Peminjaman | Radio button | Ya | Selalu | Pilihan: `Lab` / `Alat` |
| 2 | Pilih Item | Dropdown | Ya | Selalu | Lab: hanya status `tersedia`. Alat: status `tersedia` + stok > 0 |
| 3 | Jumlah | Number | Untuk alat | Hanya jika tipe = `Alat` | Min 1, max = stok item terpilih |
| 4 | Tanggal Pinjam | Date picker | Ya | Selalu | Tidak boleh sebelum hari ini |
| 5 | Tanggal Kembali | Date picker | Ya | Selalu | Setelah tanggal pinjam, max tgl pinjam + `max_loan_days` |
| 6 | Keperluan | Textarea | Ya | Selalu | Min 10 karakter, max 500 karakter |
| 7 | Mata Kuliah | Text | Tidak | Hanya role `mahasiswa` | Max 100 karakter |
| 8 | Dosen Pembimbing | Text | Tidak | Hanya role `mahasiswa` | Max 100 karakter |

### Field Auto (Tidak Perlu Diisi)
| Field | Sumber |
|-------|--------|
| Nama peminjam | Dari session login |
| Email peminjam | Dari session login |
| No WA peminjam | Dari profil user |
| Nama item | Dari item yang dipilih |
| Status | Auto `pending` |

### Peringatan Profil
Jika `no_wa` belum diisi di profil: muncul banner peringatan di form peminjaman:
> "Lengkapi nomor WhatsApp di profil Anda agar admin dapat menghubungi Anda jika perlu."

### Notifikasi yang Diterima Peminjam
- Email: konfirmasi saat pengajuan masuk
- Email: saat peminjaman di-approve (beserta instruksi pengambilan)
- Email: saat peminjaman di-reject (beserta alasan)
- Email: reminder jam 16:00 jika hari ini adalah tanggal kembali
- Email: peringatan overdue jika sudah melewati tanggal kembali
- Email: konfirmasi saat pengembalian dikonfirmasi admin

---

## Fitur Admin & Staff

### Kelola Peminjaman
- Lihat semua peminjaman (filter: status, tipe, tanggal, nama peminjam)
- Lihat detail peminjaman
- Approve peminjaman (dengan catatan opsional)
- Reject peminjaman (catatan wajib, menjadi alasan di email peminjam)
- Konfirmasi pengembalian (isi kondisi, catatan, denda jika ada)
- Lihat daftar peminjaman pending yang butuh action (approval queue)
- Lihat daftar peminjaman yang harus dikembalikan hari ini / overdue

### Pelaporan Kerusakan & Kehilangan

#### Laporan Otomatis (Dari Proses Return)
Saat admin konfirmasi pengembalian dengan kondisi bukan `baik`, sistem otomatis membuat laporan kerusakan/kehilangan:
- Kondisi `rusak_ringan` / `rusak_berat` → laporan tipe `kerusakan`
- Kondisi `hilang` → laporan tipe `kehilangan`
- Admin tidak perlu buat laporan manual; laporan sudah terhubung ke ID peminjaman

#### Laporan Mandiri (Tanpa Peminjaman)
Admin/staff bisa buat laporan secara mandiri, misalnya saat inventarisasi menemukan kerusakan tanpa ada peminjaman aktif:
- Pilih item (lab atau alat)
- Isi tipe laporan (kerusakan / kehilangan)
- Isi deskripsi detail
- Pilih tingkat: `ringan` / `sedang` / `berat` / `hilang`
- Isi estimasi biaya (opsional)
- Upload foto bukti via URL (opsional)

#### Tindak Lanjut
Setelah laporan dibuat (baik otomatis maupun mandiri), admin melacak penanganannya:

| Status | Artinya | Aksi Berikutnya |
|--------|---------|----------------|
| `menunggu` | Laporan baru masuk, belum diproses | Update ke `dalam_proses` saat mulai ditangani |
| `dalam_proses` | Sedang diperbaiki / diproses | Update catatan progress; tandai `selesai` saat tuntas |
| `selesai` | Kerusakan sudah diperbaiki / penggantian dikonfirmasi | Status final — kondisi item diupdate |
| `diabaikan` | Tidak perlu tindak lanjut (harus ada alasan) | Status final — tetap tercatat di laporan |

#### Efek ke Item
- Saat laporan dibuat: kondisi alat/lab diupdate otomatis di sheet `alat`/`lab`
- Saat tindak lanjut `selesai`: admin bisa pilih "Kembalikan ke kondisi baik" → kondisi item kembali ke `baik`
- Jika alat hilang: stok total berkurang permanen, status → `tidak_tersedia`

#### Daftar Laporan
- Lihat semua laporan aktif (status `menunggu` + `dalam_proses`) — prioritas di dashboard admin
- Filter: tipe laporan, tingkat kerusakan, status tindak lanjut, tanggal, per item
- Lihat riwayat laporan yang sudah selesai

#### Notifikasi Laporan
- Telegram → admin channel: saat laporan baru masuk (baik otomatis maupun mandiri)
- Format: nama item, tipe laporan, tingkat, deskripsi singkat, status tindak lanjut

### Kelola Lab
- Tambah lab baru
- Edit informasi lab (nama, lokasi, kapasitas, deskripsi, foto)
- Ubah status lab (`tersedia` / `maintenance` / `tidak_tersedia`)
- Hapus lab (soft delete: ubah status ke `tidak_tersedia`)

### Kelola Alat
- Tambah alat baru
- Edit informasi alat (nama, kategori, kondisi, stok, deskripsi)
- Ubah status alat
- Hapus alat (soft delete)

### Laporan & Statistik
- Ringkasan peminjaman per periode (total, per status, per tipe)
- Status semua alat saat ini
- Daftar peminjaman overdue
- Grafik peminjaman per bulan (chart sederhana)
- Lab yang paling sering dipinjam
- Alat yang paling sering dipinjam
- **Rekap kerusakan & kehilangan per periode**
- **Total estimasi biaya perbaikan/penggantian**

### Notifikasi yang Diterima Admin (via Telegram channel)
- Peminjaman baru masuk
- Reminder 16:00: daftar peminjaman belum dikembalikan + tombol wa.me
- Alert overdue: daftar peminjaman yang sudah melewati tanggal kembali + tombol wa.me
- **Laporan kerusakan/kehilangan baru masuk** (otomatis dari return maupun mandiri)
- (Opsional) Daily summary: ringkasan aktivitas hari ini

---

## Fitur Admin Only (Bukan Staff)

### Kelola User
- Lihat semua user
- Tambah user baru
- Edit user (nama, role, status, no_wa)
- Nonaktifkan user (soft delete: status `nonaktif`)
- Reset password user
- Unlock akun yang ter-lock (karena brute force)

### Audit Log
- Lihat log semua aktivitas sistem, termasuk semua aksi laporan kerusakan
- Filter log berdasarkan: tanggal, aksi, user
- Tidak bisa menghapus log (append-only)

---

## Fitur Sistem (Otomatis, Tidak Ada User)

### Reminder 16:00 (GAS Time-Driven Trigger)
Berjalan otomatis setiap hari jam 16:00 WIB:
1. Cek semua peminjaman status `approved` yang belum dikembalikan
2. **Tgl kembali = hari ini**: kirim email reminder ke peminjam + Telegram alert ke admin
3. **Tgl kembali sudah lewat**: update status ke `overdue` + kirim email peringatan ke peminjam + Telegram alert ke admin dengan tombol wa.me
4. Catat aksi ke `log_audit`

### Manajemen Stok Alat (Otomatis)
- Stok berkurang: saat peminjaman di-approve
- Stok bertambah: saat pengembalian dikonfirmasi
- Stok tidak berubah: saat peminjaman di-reject atau masih pending

---

## Roadmap Fitur Masa Depan

> Catat ide fitur yang belum diimplementasi di sini.

- [x] **Lupa Password** — request via email, link reset 1 jam, halaman buat password baru (`/#/reset-password?token=...`)
- [ ] QR Code per lab/alat untuk scan saat ambil dan kembali
- [ ] Kalender ketersediaan lab (lihat jadwal yang sudah dibooking)
- [ ] Export laporan ke PDF/Excel
- [ ] Notifikasi in-app (badge di dashboard)
- [ ] Approval peminjaman berulang (recurring)
- [ ] Daftar tunggu jika lab/alat sedang dipinjam
