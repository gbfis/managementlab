# UI/UX Design

> Dokumen ini berisi panduan desain visual, komponen, layout, dan prinsip
> anti-AI-slop untuk sistem SMLA.

---

## Dua Mode Tampilan

Aplikasi punya **satu codebase** tapi **dua mode tampilan** berdasarkan role.
Setelah login, sistem cek role dan redirect ke dashboard yang sesuai.

### Mode A — Dashboard Admin/Staff

| Halaman | Route | Keterangan |
|---------|-------|-----------|
| Dashboard | `/` | Statistik sistem: total peminjaman aktif, pending, overdue, lab tersedia |
| Semua Peminjaman | `/peminjaman` | List semua peminjaman, filter status/tipe/tanggal |
| Detail Peminjaman | `/peminjaman/:id` | Detail + tombol approve/reject/return |
| Lab | `/lab` | CRUD lab, ubah status |
| Alat | `/alat` | CRUD alat, ubah status, update stok |
| Pengembalian | `/pengembalian` | Queue peminjaman yang perlu dikonfirmasi return |
| User | `/user` | CRUD user (admin only) |
| Laporan | `/laporan` | Grafik, statistik, export (admin/staff) |
| Audit Log | `/audit` | Log semua aktivitas (admin only) |

**Komponen khusus admin:**
- Approval queue: card list peminjaman pending dengan tombol quick approve/reject
- Return queue: list peminjaman approved yang perlu konfirmasi pengembalian
- Overdue alert banner: muncul di atas halaman jika ada peminjaman overdue
- Statistik card: 5 card di dashboard (total aktif, pending, overdue, lab tersedia, alat tersedia)

### Mode B — Dashboard Peminjam (Mahasiswa/Dosen)

| Halaman | Route | Keterangan |
|---------|-------|-----------|
| Dashboard | `/` | Peminjaman aktif saya, pengingat tanggal kembali |
| Peminjaman Saya | `/peminjaman` | List peminjaman milik sendiri, filter status |
| Detail Peminjaman | `/peminjaman/:id` | Detail read-only, tidak ada tombol approve |
| Ajukan Peminjaman | `/peminjaman/baru` | Form pengajuan baru |
| Lab | `/lab` | View only: nama, lokasi, ketersediaan |
| Alat | `/alat` | View only: nama, kategori, stok tersedia |

**Komponen khusus peminjam:**
- Active loan card: card yang menampilkan peminjaman aktif + tanggal kembali + countdown
- Quick action: tombol "Ajukan Peminjaman" prominent di hero area dashboard
- Status badge di setiap peminjaman: pending/approved/overdue/returned

### Perbedaan Mode

| Aspek | Admin/Staff | Peminjam |
|-------|-------------|----------|
| Scope peminjaman | Semua | Hanya milik sendiri |
| Aksi peminjaman | Approve, reject, return | Create, view |
| Lab & alat | CRUD + ubah status | View only |
| User management | Ada (admin) | Tidak ada |
| Laporan | Lengkap | Tidak ada |
| Audit log | Ada (admin) | Tidak ada |
| Menu sidebar | 8-10 item | 4-5 item |
| Dashboard utama | Statistik sistem | Status peminjaman saya |

---

## Design System

### Color Palette

```
/* Warna terbatas, semua punya makna */

/* Neutral */
--color-bg:          #f7f8fa   /* Background halaman */
--color-surface:     #ffffff   /* Card, modal, input */
--color-border:      #e2e8f0   /* Border, divider */
--color-text:        #1a202c   /* Teks utama */
--color-text-muted:  #718096   /* Teks sekunder, label */

/* Primary — aksi utama, link */
--color-primary:     #1a365d   /* Biru tua */
--color-primary-hover: #2a4a7f

/* Status — warna punya arti spesifik, tidak untuk dekorasi */
--color-success:     #2f855a   /* Approved, returned, sukses */
--color-warning:     #d69e2e   /* Pending, perlu perhatian */
--color-danger:      #c53030   /* Rejected, overdue, error */
--color-neutral:     #718096   /* Status netral, returned */
```

**Aturan warna:**
- Tidak ada gradient kecuali ada alasan kuat
- Warna status konsisten di seluruh aplikasi
- Tidak ada warna dekoratif yang tidak bermakna

### Tipografi

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
               Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}
```

| Penggunaan | Size | Weight |
|-----------|------|--------|
| Heading halaman | 24px | 600 |
| Heading section | 18px | 600 |
| Body text | 14px | 400 |
| Form input | 16px | 400 |
| Label, secondary | 13px | 400 |
| Badge, chip | 12px | 500 |

- Tidak ada font < 12px
- System font stack — tidak perlu web font, load instan

### Spacing (4px grid)
```
4px   → gap sangat kecil (antara icon dan label)
8px   → padding kecil, gap list item
12px  → padding form input
16px  → padding card, gap antar elemen
24px  → padding section, gap besar
32px  → margin antar section
48px  → padding halaman
```

### Komponen

#### Button
Hanya 2 variant — tidak lebih:
```
Primary   → background: var(--color-primary), text: white
Secondary → background: transparent, border: 1px solid, text: var(--color-primary)
Danger    → hanya untuk aksi destructive (hapus, reject)
```

**Tidak ada:** ghost, outline-primary, link-style, icon-only kecuali dengan aria-label.

#### Status Badge
```
pending  → background: #fefcbf, text: #744210, border: #f6e05e
approved → background: #f0fff4, text: #22543d, border: #9ae6b4
rejected → background: #fff5f5, text: #742a2a, border: #feb2b2
returned → background: #e2e8f0, text: #4a5568, border: #cbd5e0
overdue  → background: #fff5f5, text: #742a2a, border: #fc8181 (lebih terang dari rejected)
```

#### Table
Satu style, semua halaman:
- Header: background `var(--color-border)`, text weight 500
- Row hover: background `var(--color-bg)`
- Border: 1px solid `var(--color-border)`
- Tidak ada shadow
- Paginasi: prev/next + nomor halaman, client-side

#### Form Input
```css
input, select, textarea {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 16px;     /* 16px mencegah auto-zoom di iOS */
  width: 100%;
}

input:focus {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary);
  outline-offset: 0;
}
```

**Label selalu ada** — tidak boleh placeholder-only.

#### Modal
- Overlay: `rgba(0,0,0,0.4)`
- Max-width: 480px (mobile full-width)
- Tombol: kanan bawah (cancel kiri, confirm kanan)
- Close button: ✕ di pojok kanan atas, dengan `aria-label="Tutup"`
- Trap focus: keyboard tidak keluar dari modal saat modal terbuka

#### Toast Notification
- Posisi: kanan atas, z-index tinggi
- Auto dismiss: 4 detik
- Variant: sukses (hijau), error (merah), info (biru)
- Tidak ada animasi bounce/slide berlebihan — fade in/out 150ms

---

## Animasi & Transisi

**Aturan: animasi hanya untuk state change yang meaningful.**

| Elemen | Transisi | Durasi |
|--------|----------|--------|
| Button hover | color/background | 150ms ease |
| Modal open/close | opacity 0→1 | 150ms ease-out |
| Toast appear/dismiss | opacity 0→1 | 150ms ease-out |
| Dropdown open | height clip | 100ms ease |
| Loading spinner | rotation | continuous |

**Tidak ada:**
- Fade-in setiap halaman load
- Scale-on-hover untuk card
- Staggered animation list item
- Parallax, float, bounce

---

## Empty States

Setiap halaman punya empty state yang berguna, bukan hanya "Tidak ada data".

| Halaman | Empty State |
|---------|------------|
| Peminjaman saya | "Belum ada peminjaman. Klik 'Ajukan Peminjaman' untuk mulai." |
| Semua peminjaman (admin) | "Belum ada peminjaman yang masuk." |
| Peminjaman pending | "Tidak ada pengajuan yang menunggu persetujuan." |
| Lab | "Belum ada lab yang terdaftar. Tambah lab pertama." |
| Alat | "Belum ada alat yang terdaftar. Tambah alat pertama." |
| User | "Belum ada user. Tambah user pertama." |
| Laporan periode kosong | "Tidak ada aktivitas peminjaman di periode ini." |

---

## Loading States

- Tampilkan spinner/skeleton saat fetch data (bukan langsung render kosong)
- Skeleton: blok abu-abu dengan lebar variatif, tidak ada animasi shimmer berlebihan
- Tombol submit: disabled + teks berubah ("Menyimpan...") selama request berlangsung
- Tidak ada fake loading bar

---

## Bahasa Indonesia

**Prinsip: natural, formal-sopan, tidak robotik, tidak terjemahan harfiah.**

| Jangan | Gunakan |
|--------|---------|
| Submit | Kirim / Simpan |
| Cancel | Batal |
| Delete | Hapus |
| Error: Validation failed | Periksa kembali isian Anda |
| Item not found | Data tidak ditemukan |
| Unauthorized | Anda harus login terlebih dahulu |
| Forbidden | Anda tidak memiliki izin untuk aksi ini |
| Loading... | Memuat... |

**Error message harus menjelaskan apa yang salah dan cara memperbaiki:**
- ❌ `"Error: VALIDATION_ERROR"`
- ✅ `"Tanggal kembali harus setelah tanggal pinjam"`
- ✅ `"Jumlah melebihi stok tersedia (stok: 3 unit)"`

---

## Aksesibilitas (WCAG AA)

- Kontras minimum 4.5:1 untuk teks normal, 3:1 untuk teks besar
- Focus indicator: `outline: 2px solid var(--color-primary)` — tidak boleh dihilangkan
- Keyboard navigable: tab order logis mengikuti urutan visual
- Form: setiap input punya `<label>` yang terhubung via `for`/`id`
- Icon button: wajib punya `aria-label`
- Status badge: jangan hanya pakai warna — tambah teks statusnya
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<button>` bukan `<div onclick>`
- Modal: gunakan `role="dialog"` + `aria-modal="true"` + trap focus

---

## Responsif

**Mobile-first, tapi tidak membuang desktop.**

| Breakpoint | Layout |
|-----------|--------|
| < 640px | Single column, sidebar tersembunyi (hamburger menu) |
| 640px–1024px | 2 kolom di beberapa section, sidebar tetap |
| > 1024px | Multi kolom, sidebar permanen |

- Touch target minimum: 44×44px
- Jarak antar tombol di mobile: minimum 8px
- Tabel responsif: scroll horizontal di mobile, tidak dipotong

---

## Performa

Target: **Lighthouse 90+** di semua kategori.

- Bundle JS < 50KB gzipped
- CSS < 20KB gzipped
- Tidak ada web font (pakai system font)
- Tidak ada library berat (moment.js, lodash, jQuery, dll.)
- Tidak ada CDN CSS runtime (Tailwind harus di-build, bukan CDN)
- Lazy load data: fetch hanya saat halaman aktif
- Tidak load semua data sekaligus saat app start
