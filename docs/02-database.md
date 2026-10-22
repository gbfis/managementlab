# Database Schema — Google Sheets

> Satu Google Spreadsheet dengan multiple sheets (tab). Setiap sheet = satu tabel.
> Admin bisa langsung lihat dan edit data dari Spreadsheet.

---

## Sheet: `users`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key, auto-generated |
| nama | TEXT | Nama lengkap |
| email | TEXT | Email unik, untuk login & notifikasi |
| nip_nim | TEXT | NIP (dosen/staf) atau NIM (mahasiswa) |
| role | ENUM | `admin` / `staff` / `mahasiswa` / `dosen` |
| no_wa | TEXT | Nomor WhatsApp — untuk tombol wa.me di notifikasi admin Telegram |
| telegram_chat_id | TEXT | Chat ID Telegram user (opsional) |
| password_hash | TEXT | SHA-256 hash dari password + salt |
| salt | TEXT | Random salt per user, berbeda-beda |
| login_attempt | NUMBER | Hitungan percobaan login gagal |
| status | ENUM | `aktif` / `nonaktif` |
| created_at | DATETIME | ISO 8601 |

**Catatan:**
- `no_wa` diisi sekali di halaman profil, bukan per form peminjaman
- Jika `no_wa` kosong, tombol wa.me tidak muncul di notifikasi Telegram admin
- `login_attempt` direset ke 0 setelah login berhasil; akun di-lock setelah 5x gagal

---

## Sheet: `lab`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| nama_lab | TEXT | Nama ruang lab |
| kode_lab | TEXT | Kode unik, mis. `LAB-A` |
| lokasi | TEXT | Gedung/lantai/ruang |
| kapasitas | NUMBER | Jumlah orang maksimal |
| deskripsi | TEXT | Keterangan fasilitas lab |
| foto_url | TEXT | URL foto lab (opsional) |
| status | ENUM | `tersedia` / `maintenance` / `tidak_tersedia` |
| created_at | DATETIME | ISO 8601 |

**Catatan:**
- Status dikelola admin via dashboard
- Hanya lab dengan status `tersedia` yang muncul di dropdown form peminjaman
- Status `maintenance` = sedang perbaikan; `tidak_tersedia` = permanen tidak bisa dipinjam

---

## Sheet: `alat`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| nama_alat | TEXT | Nama alat |
| kode_alat | TEXT | Kode inventaris unik |
| id_lab | TEXT | FK → lab.id (lokasi alat disimpan) |
| kategori | TEXT | Kategori alat, mis. `Elektronik`, `Optik`, `Mekanik` |
| kondisi | ENUM | `baik` / `rusak_ringan` / `rusak_berat` |
| stok | NUMBER | Jumlah unit yang tersedia saat ini |
| stok_total | NUMBER | Jumlah unit total (sebelum ada yang dipinjam) |
| deskripsi | TEXT | Spesifikasi singkat |
| status | ENUM | `tersedia` / `dipinjam` / `maintenance` |
| created_at | DATETIME | ISO 8601 |

**Catatan:**
- Hanya alat status `tersedia` dengan `stok > 0` yang muncul di dropdown form
- `stok` dikurangi saat peminjaman di-approve, dikembalikan saat status `returned`
- Jika peminjaman di-reject, stok tidak berubah

---

## Sheet: `peminjaman`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| id_peminjam | TEXT | FK → users.id |
| nama_peminjam | TEXT | Denormalized (dari users) |
| email_peminjam | TEXT | Denormalized (dari users) |
| no_wa_peminjam | TEXT | Denormalized (dari users.no_wa, untuk notifikasi) |
| tipe_peminjaman | ENUM | `lab` / `alat` |
| id_item | TEXT | FK → lab.id atau alat.id |
| nama_item | TEXT | Denormalized (nama lab atau alat) |
| jumlah | NUMBER | Jumlah unit (hanya relevan untuk alat; untuk lab selalu 1) |
| tanggal_pinjam | DATE | Tanggal mulai pinjam |
| tanggal_kembali_rencana | DATE | Tanggal rencana kembali |
| tanggal_kembali_actual | DATE | Diisi saat return (nullable) |
| keperluan | TEXT | Alasan/deskripsi peminjaman |
| mata_kuliah | TEXT | Nama mata kuliah (opsional, untuk mahasiswa) |
| dosen_pembimbing | TEXT | Nama dosen pembimbing (opsional, untuk mahasiswa) |
| status | ENUM | `pending` / `approved` / `rejected` / `returned` / `overdue` |
| approved_by | TEXT | FK → users.id (admin/staff yang approve) |
| catatan_admin | TEXT | Catatan saat approve/reject (nullable) |
| created_at | DATETIME | ISO 8601 |
| updated_at | DATETIME | ISO 8601 |

**Status Flow:**
```
pending → approved → returned
pending → rejected
approved → overdue  (jika lewat tanggal kembali, diupdate trigger 16:00)
overdue  → returned (masih bisa dikembalikan meski terlambat)
```

---

## Sheet: `pengembalian`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| id_peminjaman | TEXT | FK → peminjaman.id |
| tanggal_kembali | DATETIME | Waktu aktual pengembalian |
| kondisi | ENUM | `baik` / `rusak_ringan` / `rusak_berat` / `hilang` |
| catatan | TEXT | Catatan kondisi/kerusakan (nullable) |
| denda | NUMBER | Nominal denda dalam rupiah (nullable, 0 jika tidak ada) |
| returned_by | TEXT | FK → users.id (admin/staff yang konfirmasi return) |
| created_at | DATETIME | ISO 8601 |

**Catatan:**
- Saat pengembalian dikonfirmasi: status peminjaman diupdate ke `returned`, kondisi alat diupdate di sheet `alat`, stok alat dikembalikan

---

## Sheet: `laporan_kerusakan`

> Sheet ini menampung semua laporan kerusakan atau kehilangan — baik yang muncul
> saat pengembalian, maupun yang dilaporkan secara mandiri (ditemukan tanpa ada
> kejadian peminjaman aktif).

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| tipe_item | ENUM | `lab` / `alat` |
| id_item | TEXT | FK → lab.id atau alat.id |
| nama_item | TEXT | Denormalized |
| tipe_laporan | ENUM | `kerusakan` / `kehilangan` |
| sumber | ENUM | `pengembalian` / `mandiri` — apakah berasal dari proses return atau dilaporkan langsung |
| id_peminjaman | TEXT | FK → peminjaman.id (nullable — kosong jika sumber = `mandiri`) |
| id_pelapor | TEXT | FK → users.id (admin/staff yang melaporkan) |
| nama_pelapor | TEXT | Denormalized |
| deskripsi | TEXT | Deskripsi kerusakan/kehilangan secara detail |
| foto_url | TEXT | URL foto bukti kerusakan (opsional, bisa diisi setelah laporan) |
| tingkat_kerusakan | ENUM | `ringan` / `sedang` / `berat` / `hilang` — severity |
| estimasi_biaya | NUMBER | Estimasi biaya perbaikan/penggantian dalam rupiah (nullable) |
| status_tindak_lanjut | ENUM | `menunggu` / `dalam_proses` / `selesai` / `diabaikan` |
| tindak_lanjut | TEXT | Deskripsi tindak lanjut yang sudah/akan dilakukan (nullable) |
| diselesaikan_oleh | TEXT | FK → users.id (admin yang update status ke selesai, nullable) |
| tanggal_selesai | DATE | Tanggal tindak lanjut selesai (nullable) |
| created_at | DATETIME | ISO 8601 |
| updated_at | DATETIME | ISO 8601 |

**Status Flow Tindak Lanjut:**
```
menunggu → dalam_proses → selesai
menunggu → diabaikan    (jika keputusan tidak perlu tindak lanjut, harus ada alasan)
dalam_proses → selesai
```

**Catatan:**
- Laporan `sumber = pengembalian` dibuat otomatis oleh sistem saat admin konfirmasi return dengan kondisi `rusak_ringan`, `rusak_berat`, atau `hilang`
- Laporan `sumber = mandiri` dibuat manual oleh admin/staff tanpa keterkaitan peminjaman — misalnya alat ditemukan rusak saat inventarisasi
- Status item di sheet `alat` atau `lab` diupdate otomatis saat laporan dibuat

---

## Sheet: `log_audit`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| timestamp | DATETIME | ISO 8601 |
| user_email | TEXT | Email user yang melakukan aksi (`system` untuk trigger otomatis) |
| aksi | TEXT | Lihat list aksi di bawah |
| detail | TEXT | JSON string berisi detail aksi |
| ip_address | TEXT | IP address pengirim request (best effort) |

**List Aksi:**
`login` / `logout` / `login_failed` / `account_locked` /
`create_peminjaman` / `approve` / `reject` / `return` /
`create_lab` / `update_lab` / `delete_lab` /
`create_alat` / `update_alat` / `delete_alat` /
`create_user` / `update_user` / `delete_user` /
`create_laporan_kerusakan` / `update_tindak_lanjut` / `selesai_tindak_lanjut` /
`daily_reminder` / `overdue_update`

**Catatan:**
- Log hanya append, tidak pernah dihapus
- Digunakan untuk audit trail dan debugging

---

## Sheet: `config`

| key | Contoh Value | Keterangan |
|-----|-------------|-----------|
| `admin_email` | `admin@lab.ac.id` | Email admin default untuk notifikasi |
| `max_loan_days` | `7` | Maksimal hari peminjaman |
| `denda_per_hari` | `10000` | Denda keterlambatan per hari (rupiah) |
| `sistem_nama` | `SMLA - Lab Teknik` | Nama sistem, muncul di email & UI |

**Catatan:**
- Secrets (bot token, channel ID) **tidak** disimpan di sheet ini
- Secrets disimpan di GAS `PropertiesService` (terenkripsi, tidak terlihat di sheet)

---

## Relasi Antar Sheet

```
users ──────────────── peminjaman (1 user → banyak peminjaman)
lab ─────────────────┬─ peminjaman (1 lab → banyak peminjaman)
alat ────────────────┘
peminjaman ──────────── pengembalian (1 peminjaman → 1 pengembalian)
pengembalian ────────── laporan_kerusakan (1 pengembalian → 0/1 laporan, jika kondisi rusak/hilang)
lab ─────────────────┬─ laporan_kerusakan (laporan mandiri per item)
alat ────────────────┘
users ──────────────── log_audit (1 user → banyak log)
lab ─────────────────── alat (1 lab → banyak alat)
```
