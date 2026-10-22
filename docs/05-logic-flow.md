# Logic Flow — Alur Bisnis & Notifikasi

> Dokumen ini menjelaskan semua alur logika bisnis: peminjaman, notifikasi,
> reminder otomatis, dan manajemen stok.

---

## 1. Alur Peminjaman Utama

```
Peminjam buka form → isi data → submit
    ↓
[GAS] Validasi input
    ↓ (jika valid)
[GAS] Simpan ke sheet peminjaman (status: pending)
    ↓
[GAS] Catat ke log_audit
    ↓
[GAS] Email konfirmasi → peminjam
      "Pengajuan diterima, menunggu persetujuan admin"
    ↓
[GAS] Telegram notifikasi → admin channel
      "Peminjaman baru: [nama] ingin meminjam [item]"
    ↓
Response sukses → frontend tampilkan pesan berhasil
```

---

## 2. Alur Approve Peminjaman

```
Admin buka detail peminjaman → klik Approve → isi catatan (opsional) → submit
    ↓
[GAS] Validasi: status harus 'pending', user harus admin/staff
    ↓
[GAS] Update status peminjaman → 'approved'
    ↓ (jika tipe = alat)
[GAS] Kurangi stok alat: stok = stok - jumlah
    ↓
[GAS] Catat ke log_audit
    ↓
[GAS] Email → peminjam
      "Peminjaman disetujui. [catatan admin]. Silakan ambil [item]."
    ↓
Response sukses
```

---

## 3. Alur Reject Peminjaman

```
Admin buka detail peminjaman → klik Reject → isi alasan (wajib) → submit
    ↓
[GAS] Validasi: status harus 'pending', catatan tidak boleh kosong
    ↓
[GAS] Update status peminjaman → 'rejected'
    ↓
[GAS] Stok alat TIDAK berubah (belum pernah dikurangi)
    ↓
[GAS] Catat ke log_audit
    ↓
[GAS] Email → peminjam
      "Peminjaman ditolak. Alasan: [catatan admin]"
    ↓
Response sukses
```

---

## 4. Alur Pengembalian

```
Admin konfirmasi pengembalian → isi kondisi + catatan + denda → submit
    ↓
[GAS] Validasi: status harus 'approved' atau 'overdue'
    ↓
[GAS] Update status peminjaman → 'returned'
[GAS] Set tanggal_kembali_actual = sekarang
    ↓
[GAS] Insert ke sheet pengembalian (kondisi, catatan, denda, returned_by)
    ↓ (jika tipe = alat)
[GAS] Tambah stok alat: stok = stok + jumlah_pinjam
[GAS] Update kondisi alat (jika kondisi pengembalian lebih buruk)
    ↓
[GAS] Catat ke log_audit
    ↓
[GAS] Email → peminjam
      "Pengembalian diterima. Kondisi: [kondisi]. Denda: [denda]"
    ↓
Response sukses
```

---

## 5. Reminder Otomatis 16:00 (Time-Driven Trigger)

### Setup (Sekali Saja)
```javascript
function installDailyReminderTrigger() {
  ScriptApp.newTrigger('checkAndRemindReturns')
    .timeBased()
    .everyDays(1)
    .atHour(16)        // Jam 16 WIB (set timezone Asia/Jakarta di appsscript.json)
    .create();
}
```

### Alur Setiap Hari Jam 16:00
```
[GAS] Ambil semua peminjaman status = 'approved'
    ↓
[GAS] Untuk setiap peminjaman, cek tanggal_kembali_rencana:

    ┌── Tgl kembali = HARI INI ──────────────────────────────┐
    │  Kirim email reminder → peminjam                        │
    │  "Kembalikan [item] hari ini sebelum jam tutup"         │
    │                                                         │
    │  Kirim Telegram → admin channel                         │
    │  "⏰ Harus kembali hari ini: [nama] — [item]"           │
    │  + tombol inline: [WhatsApp Nama] [Email Nama]          │
    └─────────────────────────────────────────────────────────┘

    ┌── Tgl kembali SUDAH LEWAT ─────────────────────────────┐
    │  Update status → 'overdue'                              │
    │                                                         │
    │  Kirim email peringatan → peminjam                      │
    │  "Terlambat [N] hari. Segera kembalikan."               │
    │                                                         │
    │  Kirim Telegram → admin channel                         │
    │  "🚨 OVERDUE: [nama] — [item] ([N] hari terlambat)"    │
    │  + tombol inline: [WhatsApp Nama] [Email Nama]          │
    └─────────────────────────────────────────────────────────┘

    ↓
[GAS] Catat ke log_audit (aksi: 'daily_reminder')
```

### Format Tombol Inline Telegram
Telegram mendukung **inline keyboard** — tombol URL yang muncul di bawah pesan:

```javascript
function buildContactButtons(namaPeminjam, noWa, emailPeminjam) {
  var buttons = [];

  if (noWa) {
    // Normalisasi nomor: 08xx → 628xx
    var waNumber = noWa.replace(/[^0-9]/g, '');
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.slice(1);

    buttons.push({ text: '💬 WA ' + namaPeminjam, url: 'https://wa.me/' + waNumber });
  }

  buttons.push({ text: '✉️ Email ' + namaPeminjam, url: 'mailto:' + emailPeminjam });

  return [buttons]; // Array of rows; satu row berisi semua tombol peminjam ini
}
```

Admin klik tombol → WA/email client terbuka → admin kirim pesan manual ke peminjam.
Sistem tidak kirim WA otomatis (tidak butuh WhatsApp API).

### Escalation (Overdue > 3 Hari)
- Telegram dikirim ulang setiap hari (bukan hanya sekali)
- Pesan Telegram berisi flag "URGENT" + hitung hari keterlambatan
- Denda otomatis dihitung dari `denda_per_hari` di config (tetapi tetap harus dikonfirmasi admin saat return)

---

## 6. Manajemen Stok Alat

```
Peminjaman CREATED (pending)   → stok TIDAK berubah
Peminjaman APPROVED            → stok DIKURANGI sebesar jumlah
Peminjaman REJECTED            → stok TIDAK berubah
Peminjaman RETURNED            → stok DITAMBAH sebesar jumlah_pinjam
Peminjaman OVERDUE             → stok TIDAK berubah (masih dipinjam)
```

**Edge case**: Jika admin approve dua peminjaman alat yang sama secara bersamaan dan totalnya melebihi stok, peminjaman kedua yang di-approve akan gagal dengan error `CONFLICT: Stok tidak mencukupi`. GAS cek ulang stok saat approve, bukan saat peminjaman dibuat.

---

## 7. Alur Login & Session

```
User submit form login (email + password)
    ↓
[GAS] Cari user di sheet 'users' berdasarkan email
    ↓ (jika tidak ditemukan)
    → Return error: "Email atau password salah"

    ↓ (jika ditemukan, cek status)
    → Status 'nonaktif': return error "Akun Anda dinonaktifkan"
    → Status 'terkunci': return error "Akun terkunci, hubungi admin"

    ↓ (status aktif, verifikasi password)
    → Hash password input + salt → bandingkan dengan password_hash
    → Tidak cocok: increment login_attempt; jika ≥ 5 → lock akun → log audit
    → Tidak cocok: return error "Email atau password salah"

    ↓ (password cocok)
    → Reset login_attempt = 0
    → Generate session token
    → Simpan token di PropertiesService (TTL 24 jam)
    → Log audit: aksi 'login'
    → Return: { token, user: { id, nama, email, role } }
```

---

## 8. Alur Validasi Request di GAS

Setiap request masuk ke `doGet`/`doPost`:

```
1. Parse action dan payload
    ↓
2. Cek token (kecuali action 'login')
   → Tidak ada token → UNAUTHORIZED
   → Token expired/tidak valid → UNAUTHORIZED
    ↓
3. Load user dari token
    ↓
4. Cek rate limit (60 req/menit per user)
   → Melebihi limit → RATE_LIMITED
    ↓
5. Cek permission role untuk action ini
   → Role tidak punya izin → FORBIDDEN
    ↓
6. Validasi payload input
   → Input tidak valid → VALIDATION_ERROR (dengan pesan spesifik)
    ↓
7. Eksekusi logic bisnis
    ↓
8. Return response
```

---

## 9. Alur Pelaporan Kerusakan & Kehilangan

### 9a. Laporan Otomatis (dari Proses Return)

Berjalan otomatis saat `returnPeminjaman` dipanggil dengan kondisi ≠ `baik`:

```
Admin konfirmasi return → isi kondisi (rusak_ringan / rusak_berat / hilang)
    ↓
[GAS] Simpan pengembalian ke sheet pengembalian
    ↓
[GAS] Update status peminjaman → 'returned'
    ↓
[GAS] Cek kondisi pengembalian:

    ┌── kondisi = 'baik' ────────────────────────────────────┐
    │  Update kondisi alat tetap 'baik'                       │
    │  Tambah stok alat                                       │
    │  Selesai — tidak buat laporan                           │
    └─────────────────────────────────────────────────────────┘

    ┌── kondisi = 'rusak_ringan' / 'rusak_berat' ────────────┐
    │  Update kondisi alat di sheet alat                      │
    │  Tambah stok alat (masih bisa dihitung, meski rusak)    │
    │                                                         │
    │  AUTO-CREATE laporan_kerusakan:                         │
    │    tipe_laporan = 'kerusakan'                           │
    │    sumber = 'pengembalian'                              │
    │    id_peminjaman = id peminjaman ini                    │
    │    tingkat = sesuai kondisi                             │
    │    status_tindak_lanjut = 'menunggu'                    │
    │                                                         │
    │  Telegram → admin channel                               │
    │  "🔧 LAPORAN KERUSAKAN: [item] dikembalikan rusak"      │
    └─────────────────────────────────────────────────────────┘

    ┌── kondisi = 'hilang' ──────────────────────────────────┐
    │  Update kondisi alat → rusak_berat                      │
    │  TIDAK tambah stok (alat hilang)                        │
    │  stok_total berkurang 1 (permanen)                      │
    │  Jika stok_total = 0: status alat → 'tidak_tersedia'    │
    │                                                         │
    │  AUTO-CREATE laporan_kerusakan:                         │
    │    tipe_laporan = 'kehilangan'                          │
    │    sumber = 'pengembalian'                              │
    │    tingkat = 'hilang'                                   │
    │    status_tindak_lanjut = 'menunggu'                    │
    │                                                         │
    │  Telegram → admin channel                               │
    │  "🚨 LAPORAN KEHILANGAN: [item] dilaporkan hilang"      │
    │  + tombol wa.me peminjam yang bersangkutan              │
    └─────────────────────────────────────────────────────────┘

    ↓
[GAS] Email → peminjam (konfirmasi pengembalian + info kondisi + denda jika ada)
[GAS] Catat ke log_audit
```

---

### 9b. Laporan Mandiri (Tanpa Peminjaman)

Admin/staff buat laporan secara langsung, misalnya dari hasil inventarisasi:

```
Admin buka halaman /laporan-kerusakan → klik "Laporkan Kerusakan/Kehilangan"
    ↓
Pilih item (lab atau alat) → isi form laporan
    ↓
[GAS] Validasi input
    ↓
[GAS] Simpan ke sheet laporan_kerusakan
    (sumber = 'mandiri', id_peminjaman = null)
    ↓
[GAS] Update kondisi / status item di sheet alat atau lab
    ↓
[GAS] Catat ke log_audit (aksi: 'create_laporan_kerusakan')
    ↓
[GAS] Telegram → admin channel
    "📋 LAPORAN MANDIRI: [item] dilaporkan [rusak/hilang]"
    ↓
Response sukses
```

---

### 9c. Alur Tindak Lanjut

```
Admin buka daftar laporan aktif (status: menunggu / dalam_proses)
    ↓
Pilih laporan → klik "Update Tindak Lanjut"
    ↓
Isi: status baru, catatan progress, estimasi biaya (update), foto (opsional)
    ↓
[GAS] Update sheet laporan_kerusakan
[GAS] Catat ke log_audit (aksi: 'update_tindak_lanjut')
    ↓
    ┌── Status = 'selesai' ──────────────────────────────────┐
    │  Isi: catatan penyelesaian, tanggal selesai             │
    │  Admin bisa pilih: "Kembalikan kondisi item ke baik"    │
    │                                                         │
    │  Jika dipilih:                                          │
    │    Update kondisi alat/lab → 'baik'                     │
    │    Jika alat hilang & sudah diganti: update stok_total  │
    │                                                         │
    │  Catat log_audit (aksi: 'selesai_tindak_lanjut')        │
    └─────────────────────────────────────────────────────────┘

    ┌── Status = 'diabaikan' ────────────────────────────────┐
    │  Wajib isi alasan mengapa diabaikan                     │
    │  Kondisi item TIDAK berubah (tetap tercatat rusak)      │
    │  Catat log_audit                                        │
    └─────────────────────────────────────────────────────────┘
```

---

### 9d. Format Notifikasi Telegram — Laporan Kerusakan

Laporan dari pengembalian (rusak):
```
🔧 KERUSAKAN DILAPORKAN
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: Oscilloscope Tektronix (OSC-03)
📍 Lokasi: Lab Elektronika
⚠️ Tingkat: Sedang
📝 Keterangan: Layar retak, probe ch-2 putus
👤 Peminjam: Budi Santoso (2021001)
📋 Dari peminjaman: #PMJ-2026-00123
━━━━━━━━━━━━━━━━━━━━━━━
Status: Menunggu Tindak Lanjut
```

Laporan kehilangan (dari pengembalian):
```
🚨 KEHILANGAN DILAPORKAN
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: Multimeter Digital (MTR-07)
📍 Lokasi: Lab Elektronika
⚠️ Tingkat: Hilang
📋 Dari peminjaman: #PMJ-2026-00119
━━━━━━━━━━━━━━━━━━━━━━━
Status: Menunggu Tindak Lanjut

[ 💬 WA Budi Santoso ]  [ ✉️ Email Budi ]
```

Laporan mandiri:
```
📋 LAPORAN MANDIRI
━━━━━━━━━━━━━━━━━━━━━━━
📦 Item: Proyektor Epson (PRJ-02)
⚠️ Tipe: Kerusakan — Ringan
📝 Keterangan: Kabel VGA longgar, perlu diganti
👤 Dilaporkan oleh: Admin (admin@lab.ac.id)
━━━━━━━━━━━━━━━━━━━━━━━
Status: Menunggu Tindak Lanjut
```
