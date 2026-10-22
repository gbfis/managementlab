# API Design — Google Apps Script

> GAS Web App sebagai REST API. Semua request ke satu URL endpoint,
> dibedakan via parameter `action`.

---

## Struktur Request

### POST Request
```
POST {GAS_WEBAPP_URL}
Headers: {
  "Authorization": "Bearer <session_token>",
  "Content-Type": "application/json"
}
Body: {
  "action": "createPeminjaman",
  "payload": { ... }
}
```

### GET Request
```
GET {GAS_WEBAPP_URL}?action=getLabs&token=<session_token>
GET {GAS_WEBAPP_URL}?action=getPeminjaman&token=<session_token>&status=pending
```

---

## Response Format

### Sukses
```json
{
  "success": true,
  "data": { ... },
  "message": "Peminjaman berhasil dibuat",
  "timestamp": "2026-10-22T10:00:00Z"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tanggal kembali harus setelah tanggal pinjam"
  }
}
```

### Error Codes
| Code | HTTP Analog | Keterangan |
|------|-------------|-----------|
| `UNAUTHORIZED` | 401 | Token tidak ada atau tidak valid |
| `FORBIDDEN` | 403 | Role tidak punya izin untuk aksi ini |
| `VALIDATION_ERROR` | 422 | Input tidak valid (detail di message) |
| `NOT_FOUND` | 404 | Data tidak ditemukan |
| `RATE_LIMITED` | 429 | Terlalu banyak request |
| `CONFLICT` | 409 | Konflik data (mis. lab sudah dipinjam di tanggal sama) |
| `SERVER_ERROR` | 500 | Error internal GAS |

---

## Session Management

- Token = `SHA-256(userId + timestamp + randomSecret)`
- Token disimpan di GAS `PropertiesService` dengan key = token value, value = `userId|expiry`
- Token expiry: **24 jam**
- Token dikirim di header `Authorization: Bearer <token>` (POST) atau query param `?token=` (GET)
- Setiap request: GAS validate token → dapatkan userId → load user → cek role

---

## Endpoints

### Auth

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| POST | `login` | `{email, password}` | Public | Return session token + user data |
| POST | `logout` | — | Authenticated | Hapus session token |
| GET | `me` | — | Authenticated | Profil user yang sedang login |
| POST | `updateProfile` | `{nama?, no_wa?, telegram_chat_id?}` | Authenticated | Update profil sendiri |
| POST | `changePassword` | `{password_lama, password_baru}` | Authenticated | Ganti password sendiri |

---

### Lab

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getLabs` | `{?status}` | Authenticated | List lab (filter status opsional) |
| GET | `getLab` | `{id}` | Authenticated | Detail 1 lab |
| POST | `createLab` | `{nama_lab, kode_lab, lokasi, kapasitas, deskripsi?, foto_url?}` | Admin, Staff | Tambah lab baru |
| POST | `updateLab` | `{id, nama_lab?, kode_lab?, lokasi?, kapasitas?, deskripsi?, foto_url?, status?}` | Admin, Staff | Edit lab |
| POST | `deleteLab` | `{id}` | Admin | Hapus lab (soft: ubah status ke `tidak_tersedia`) |

---

### Alat

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getAlat` | `{?id_lab, ?status}` | Authenticated | List alat (filter opsional) |
| GET | `getAlatById` | `{id}` | Authenticated | Detail 1 alat |
| POST | `createAlat` | `{nama_alat, kode_alat, id_lab, kategori, kondisi, stok, deskripsi?}` | Admin, Staff | Tambah alat baru |
| POST | `updateAlat` | `{id, nama_alat?, kondisi?, stok?, status?, ...}` | Admin, Staff | Edit alat |
| POST | `deleteAlat` | `{id}` | Admin | Hapus alat (soft: status `maintenance`) |

---

### Peminjaman

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getPeminjaman` | `{?status, ?tipe, ?id_peminjam, ?from, ?to}` | Admin/Staff: semua; Mahasiswa/Dosen: milik sendiri | List peminjaman dengan filter |
| GET | `getPeminjamanById` | `{id}` | Authenticated (owner atau admin/staff) | Detail 1 peminjaman |
| GET | `getMyPeminjaman` | `{?status}` | Authenticated | Peminjaman milik user yang login |
| POST | `createPeminjaman` | `{tipe_peminjaman, id_item, jumlah?, tanggal_pinjam, tanggal_kembali_rencana, keperluan, mata_kuliah?, dosen_pembimbing?}` | Semua role | Buat peminjaman baru → kirim email + Telegram |
| POST | `approvePeminjaman` | `{id, catatan?}` | Admin, Staff | Approve → kurangi stok alat → email ke peminjam |
| POST | `rejectPeminjaman` | `{id, catatan}` | Admin, Staff | Reject → email ke peminjam (dengan alasan) |
| POST | `returnPeminjaman` | `{id, kondisi, catatan?, denda?}` | Admin, Staff | Konfirmasi return → update stok → email ke peminjam |

---

### User Management

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getUsers` | `{?status, ?role}` | Admin | List semua user |
| GET | `getUserById` | `{id}` | Admin | Detail 1 user |
| POST | `createUser` | `{nama, email, nip_nim, role, no_wa?, password}` | Admin | Tambah user baru |
| POST | `updateUser` | `{id, nama?, role?, status?, no_wa?}` | Admin | Edit user |
| POST | `resetPassword` | `{id, password_baru}` | Admin | Reset password user |
| POST | `unlockUser` | `{id}` | Admin | Unlock akun yang ter-lock (brute force) |

---

### Laporan Kerusakan & Kehilangan

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getLaporanKerusakan` | `{?status_tindak_lanjut, ?tipe_item, ?tipe_laporan, ?from, ?to}` | Admin, Staff | List semua laporan, dengan filter |
| GET | `getLaporanKerusakanById` | `{id}` | Admin, Staff | Detail 1 laporan |
| POST | `createLaporanKerusakan` | `{tipe_item, id_item, tipe_laporan, deskripsi, tingkat_kerusakan, estimasi_biaya?, foto_url?, id_peminjaman?}` | Admin, Staff | Buat laporan mandiri (tanpa keterkaitan return) |
| POST | `updateTindakLanjut` | `{id, status_tindak_lanjut, tindak_lanjut, estimasi_biaya?, foto_url?}` | Admin, Staff | Update progress tindak lanjut |
| POST | `selesaikanTindakLanjut` | `{id, tindak_lanjut, tanggal_selesai?}` | Admin, Staff | Tandai tindak lanjut selesai |

---

### Laporan & Statistik

| Method | Action | Payload | Akses | Keterangan |
|--------|--------|---------|-------|-----------|
| GET | `getReportPeminjaman` | `{from, to, ?tipe, ?status}` | Admin, Staff | Ringkasan peminjaman per periode |
| GET | `getReportAlat` | — | Admin, Staff | Status dan riwayat semua alat |
| GET | `getReportOverdue` | — | Admin, Staff | List peminjaman yang overdue saat ini |
| GET | `getAuditLog` | `{?from, ?to, ?aksi, ?user_email}` | Admin | Audit log dengan filter |

---

## Side Effects per Action

Beberapa action memicu efek samping selain menyimpan data:

| Action | Side Effects |
|--------|-------------|
| `createPeminjaman` | Email konfirmasi → peminjam; Telegram notif → admin channel |
| `approvePeminjaman` | Kurangi `stok` alat (jika tipe alat); Email → peminjam |
| `rejectPeminjaman` | Email → peminjam (beserta catatan alasan) |
| `returnPeminjaman` | Tambah `stok` alat; Update kondisi alat; Email → peminjam; **Jika kondisi rusak/hilang → buat laporan kerusakan otomatis** |
| `createLaporanKerusakan` | Update status/kondisi item di sheet `alat`/`lab`; Telegram notif → admin channel |
| `selesaikanTindakLanjut` | Update status item kembali ke kondisi normal jika sudah diperbaiki/diganti; log audit |
| `login_failed` × 5 | Set status user → `terkunci`; log audit |
| `daily_reminder` trigger | Email → peminjam; Telegram + wa.me buttons → admin channel |

---

## Contoh Payload Lengkap

### createPeminjaman (Alat)
```json
{
  "action": "createPeminjaman",
  "payload": {
    "tipe_peminjaman": "alat",
    "id_item": "uuid-alat-xxx",
    "jumlah": 2,
    "tanggal_pinjam": "2026-10-25",
    "tanggal_kembali_rencana": "2026-10-27",
    "keperluan": "Praktikum Elektronika Dasar",
    "mata_kuliah": "Elektronika Dasar",
    "dosen_pembimbing": "Dr. Ahmad Fajar"
  }
}
```

### approvePeminjaman
```json
{
  "action": "approvePeminjaman",
  "payload": {
    "id": "uuid-peminjaman-yyy",
    "catatan": "Disetujui. Ambil kunci di ruang admin."
  }
}
```

### returnPeminjaman
```json
{
  "action": "returnPeminjaman",
  "payload": {
    "id": "uuid-peminjaman-yyy",
    "kondisi": "rusak_ringan",
    "catatan": "Layar LCD retak di sudut kanan",
    "denda": 50000
  }
}
```

### createLaporanKerusakan (Mandiri)
```json
{
  "action": "createLaporanKerusakan",
  "payload": {
    "tipe_item": "alat",
    "id_item": "uuid-alat-zzz",
    "tipe_laporan": "kerusakan",
    "deskripsi": "Kabel power terkelupas, arus tidak stabil saat digunakan",
    "tingkat_kerusakan": "sedang",
    "estimasi_biaya": 75000,
    "foto_url": "https://drive.google.com/..."
  }
}
```

### updateTindakLanjut
```json
{
  "action": "updateTindakLanjut",
  "payload": {
    "id": "uuid-laporan-aaa",
    "status_tindak_lanjut": "dalam_proses",
    "tindak_lanjut": "Dikirim ke teknisi lab. Estimasi selesai 3 hari.",
    "estimasi_biaya": 100000
  }
}
```

### selesaikanTindakLanjut
```json
{
  "action": "selesaikanTindakLanjut",
  "payload": {
    "id": "uuid-laporan-aaa",
    "tindak_lanjut": "Kabel berhasil diganti. Alat sudah berfungsi normal.",
    "tanggal_selesai": "2026-10-25"
  }
}
```
