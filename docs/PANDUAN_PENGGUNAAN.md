# 📖 Panduan Penggunaan DMS

> Panduan lengkap untuk pengguna aplikasi **Document Management System** (DMS).  
> Berlaku untuk semua role: Initiator, Purchasing, Cost Control, Financial Controller, Hotel Manager, KIC, dan Admin.

---

## Daftar Isi

1. [Login ke Aplikasi](#1-login-ke-aplikasi)
2. [Halaman Dashboard](#2-halaman-dashboard)
3. [Mengelola Dokumen](#3-mengelola-dokumen)
4. [Upload Dokumen Baru](#4-upload-dokumen-baru)
5. [Melihat Detail Dokumen](#5-melihat-detail-dokumen)
6. [Menyetujui / Menolak Dokumen (Approval)](#6-menyetujui--menolak-dokumen-approval)
7. [Panel Admin — Manajemen User](#7-panel-admin--manajemen-user)
8. [Panel Admin — Manajemen Tanda Tangan](#8-panel-admin--manajemen-tanda-tangan)
9. [Panel Admin — Konfigurasi Workflow](#9-panel-admin--konfigurasi-workflow)
10. [Panel Admin — Keyword Configuration](#10-panel-admin--keyword-configuration)
11. [Panel Admin — Delegasi & Absensi](#11-panel-admin--delegasi--absensi)
12. [Pengaturan Akun (Settings)](#12-pengaturan-akun-settings)
13. [Navigasi Sidebar & Branch Selector](#13-navigasi-sidebar--branch-selector)
14. [FAQ & Troubleshooting](#14-faq--troubleshooting)

---

## 1. Login ke Aplikasi

### Langkah-langkah

1. Buka browser dan navigasi ke **http://localhost:3001** (atau URL yang diberikan IT)
2. Anda akan melihat halaman login dengan logo **DMS — Document Management System**
3. Masukkan **Email Address** yang terdaftar (contoh: `nawawi@astarahotel.com`)
4. Masukkan **Password** Anda
5. (Opsional) Centang **"Remember me"** untuk tetap login
6. Klik tombol **"Sign In"**

### Catatan

- Jika belum memiliki akun, hubungi **Administrator** untuk dibuatkan
- Password bersifat **case-sensitive**
- Login gagal akan menampilkan pesan error berwarna merah
- Setelah berhasil login, Anda akan diarahkan ke **Dashboard**

---

## 2. Halaman Dashboard

Dashboard adalah halaman utama setelah login. Halaman ini menampilkan ringkasan operasional.

### Informasi yang Ditampilkan

| Kartu Statistik | Deskripsi |
|-----------------|-----------|
| **Pending Approvals** | Jumlah dokumen yang menunggu persetujuan Anda |
| **Total Documents** | Total seluruh dokumen dalam sistem |
| **Active Users** | Jumlah user aktif (hanya terlihat oleh Admin) |

### Komponen Dashboard

- **Recent Documents** — Tabel 6 dokumen terbaru yang diupload. Klik nama dokumen untuk melihat detail.
- **Activity Feed** — Log aktivitas terbaru dalam sistem.

### Tips

- Klik **"View All"** di sebelah Recent Documents untuk melihat semua dokumen
- Statistik diperbarui secara real-time setiap kali halaman dimuat ulang

---

## 3. Mengelola Dokumen

Halaman **Documents** (`/documents`) menampilkan semua dokumen yang ada dalam sistem.

### Filter & Tampilan

**Filter berdasarkan Kategori:**
Klik chip di toolbar untuk memfilter:
- **All** — Semua kategori
- **PO** — Purchase Order
- **CA** — Cash Advance
- **Petty Cash** — Kas Kecil
- **Memo** — Memo Internal

**Filter berdasarkan Status:**
Gunakan dropdown di toolbar:
- **All Statuses** — Semua status
- **PENDING** — Menunggu persetujuan (ditampilkan teratas)
- **APPROVED** — Sudah disetujui
- **REJECTED** — Ditolak

> 💡 **Catatan:** Daftar dokumen secara default diurutkan dengan status **PENDING** terlebih dahulu, memastikan dokumen yang memerlukan aksi selalu terlihat di posisi atas.

**Mode Tampilan:**
- 📋 **Table View** — Tampilan tabel dengan kolom lengkap (default)
- 🔲 **Grid View** — Tampilan kartu/grid

### Informasi Kolom (Table View)

| Kolom | Deskripsi |
|-------|-----------|
| Document | Nama file + Document ID (contoh: `PO-2026-0042`) |
| Category | Badge warna: PO (hijau), CA (biru), Petty Cash (ungu), Memo (orange) |
| Branch | Cabang hotel |
| Date | Tanggal upload |
| Status | `PENDING` (kuning) / `APPROVED` (hijau) / `REJECTED` (merah) |
| Uploader | Nama user yang mengupload |

### Aksi

- Klik **nama dokumen** untuk melihat detail
- Klik tombol **"Upload Document"** (kanan atas) untuk upload dokumen baru
- **Admin**: Tombol **"Delete Document"** tersedia di halaman detail untuk menghapus dokumen

---

## 4. Upload Dokumen Baru

> **Siapa yang bisa upload?** Role: `admin`, `initiator`, `purchasing`

Halaman Upload (`/documents/upload`) menggunakan **wizard 3 langkah**.

### Step 1: Upload File

1. **Drag & Drop** file PDF ke area drop zone, **atau**
2. Klik tombol **"Browse Files"** untuk memilih file
3. Hanya file **PDF** yang diterima (maks. 25MB)
4. Setelah file terpilih, informasi file (nama + ukuran) akan ditampilkan
5. Klik tombol ❌ untuk menghapus file dan memilih ulang
6. Klik **"Continue"** untuk lanjut ke langkah berikutnya

### Step 2: Classify Document

1. Pilih **Document Category** (wajib):
   - **Purchase Order** (PO) — Dokumen pembelian
   - **Cash Advance** (CA) — Permintaan uang muka
   - **Petty Cash** — Pengeluaran kas kecil
   - **Memo** — Memo internal
2. Pilih **Branch** (wajib):
   - Astara Hotel
   - Pentacity Hotel
3. Pilih **Department** referensi (otomatis terisi dari Profil Anda sendiri - dapat diubah secara kasuistik untuk _cross-department_ upload).
4. (Opsional) Tambahkan **Notes** untuk informasi tambahan bagi approver
5. Klik **"Continue"**

### Step 3: Review & Submit

1. Review semua informasi:
   - File yang dipilih
   - Kategori dokumen
   - Branch
   - Notes (jika ada)
2. Baca informasi **Approval Workflow** yang akan diterapkan
3. Klik **"Submit for Approval"** untuk mengirim dokumen
4. Sistem akan otomatis:
   - Membuat Document ID unik (contoh: `PO-2026-0042`)
   - Membuat approval chain sesuai workflow yang dikonfigurasi
   - Menugaskan approver pertama
5. Setelah berhasil, Anda akan diarahkan ke halaman Documents

### Tips

- Klik **"Back"** kapan saja untuk kembali ke langkah sebelumnya
- Pastikan file PDF tidak corrupt sebelum upload
- Approval chain akan otomatis ditentukan berdasarkan kategori + branch
- **Notes** yang ditulis akan tampil di halaman **Document Detail** dan dapat dibaca oleh semua approver

---

## 5. Melihat Detail Dokumen

Halaman Detail (`/documents/:id`) menampilkan informasi lengkap dokumen dan status approval-nya.

### Layout Halaman

| Panel | Konten |
|-------|--------|
| **Panel Kiri (Lebar)** | Preview PDF — Area untuk menampilkan dokumen PDF. Tombol **Download** tersedia di header. |
| **Panel Kanan (Sidebar)** | Document Info + Approval Chain |

### Document Info

Menampilkan:
- **Title** — Nama file
- **Category** — Kategori dokumen dengan badge warna
- **Branch** — Cabang hotel
- **Uploaded** — Tanggal dan waktu upload
- **By** — Nama uploader
- **Status** — Status saat ini
- **Notes** — Catatan dari uploader untuk approver (jika ada)

### Approval Chain

Menampilkan **stepper visual** yang menunjukkan progres approval:

| Ikon | Status | Deskripsi |
|------|--------|-----------|
| ✅ Hijau | `completed` | Step sudah disetujui |
| 🕐 Kuning | `current` | Step sedang menunggu aksi |
| ❌ Merah | `rejected` | Step ditolak |
| ⚪ Abu-abu | `pending` | Step belum aktif (LOCKED) |

Setiap step menampilkan:
- Role yang dibutuhkan (contoh: COST CONTROL)
- Nama approver
- Tanggal approval (jika sudah selesai)
- Info delegasi (jika didelegasikan)
- Badge "Awaiting Action" (jika step saat ini)

---

## 6. Menyetujui / Menolak Dokumen (Approval)

> **Siapa yang bisa approve?** Role: `cost_control`, `financial_controller`, `hotel_manager`, `kic`, `admin`

### Melihat Daftar Approval

1. Klik **"My Approvals"** di sidebar
2. Halaman menampilkan 3 tab:
   - **Pending** — Dokumen yang menunggu aksi Anda (dengan jumlah)
   - **Completed** — Riwayat approval yang sudah Anda proses
   - **Delegated to Me** — Dokumen yang didelegasikan kepada Anda

### Melakukan Approval / Rejection

1. Klik dokumen dari daftar **Pending** (atau dari tab Delegated to Me)
2. Anda akan diarahkan ke halaman **Document Detail**
3. Review dokumen PDF dan informasinya
4. Pilih aksi:
   - ✅ **"Approve & Sign"** — Setujui dan tanda tangani dokumen
   - ❌ **"Reject"** — Tolak dokumen
5. Tombol aksi hanya muncul jika dokumen berstatus **PENDING** dan Anda adalah approver saat ini

### Apa yang Terjadi Setelah Approve?

1. Step saat ini ditandai `APPROVED`
2. Signature Anda otomatis ditempelkan pada PDF (jika dikonfigurasi)
3. Step berikutnya menjadi `PENDING` dan ditugaskan ke approver berikutnya
4. Jika ini step terakhir, dokumen berubah menjadi `APPROVED`

### Apa yang Terjadi Setelah Reject?

1. Step saat ini ditandai `REJECTED`
2. **Seluruh dokumen** langsung berstatus `REJECTED`
3. Uploader akan melihat status penolakan di halaman Documents

### Menghapus Dokumen (Admin Only)

1. Buka halaman **Document Detail** dari dokumen yang ingin dihapus
2. Klik tombol **"Delete Document"** (merah) di pojok kanan atas
3. Konfirmasi penghapusan pada dialog yang muncul
4. Dokumen dan seluruh approval chain-nya akan dihapus secara permanen

---

## 7. Panel Admin — Manajemen User

> **Hanya untuk role: `admin`**

Halaman: `/admin/users`

### Melihat Daftar User

Tabel menampilkan seluruh user terdaftar:

| Kolom | Deskripsi |
|-------|-----------|
| User | Avatar (inisial), nama, dan email |
| Role | Role user (dalam format terbaca) |
| Branch | Cabang hotel |
| Status | `ACTIVE` atau `BANNED` |
| Absence | Status absensi |

Gunakan **search bar** untuk mencari user berdasarkan nama atau email.

### Membuat User Baru

1. Klik tombol **"Add User"** (kanan atas)
2. Form akan muncul di bawah toolbar
3. Isi semua field:

| Field | Keterangan |
|-------|------------|
| **Full Name** | Nama lengkap staff |
| **Email Address** | Email untuk login (wajib unik) |
| **Password** | Password minimal 8 karakter |
| **Role** | Pilih dari: Initiator, Purchasing, Cost Control, Financial Controller, Hotel Manager, KIC, Admin |
| **Department** | Tetapkan target HOD routing (e.g. `FO`, `HK`, `FB`) |
| **Branch** | Pilih: Astara Hotel atau Pentacity Hotel |

4. Klik **"Create User"**
5. User baru langsung bisa login dengan email dan password yang diberikan

---

## 8. Panel Admin — Manajemen Tanda Tangan

> **Hanya untuk role: `admin`**

Halaman: `/admin/signatures`

### Fungsi

Setiap approver membutuhkan gambar tanda tangan digital (format **PNG**) yang akan otomatis ditempelkan pada PDF saat mereka menyetujui dokumen.

### Cara Upload Tanda Tangan

1. Daftar semua user ditampilkan dalam bentuk **kartu/grid**
2. Setiap kartu menampilkan:
   - Status tanda tangan (ada/belum)
   - Avatar + nama + role user
3. Klik tombol **"Upload"** (jika belum ada) atau **"Replace"** (jika sudah ada)
4. Pilih file gambar **PNG** dari komputer Anda
5. Tanda tangan langsung terupload dan terasosiasi dengan user tersebut

### Tips

- Gunakan gambar tanda tangan dengan **latar belakang transparan** (PNG)
- Resolusi yang disarankan: **300 × 100 piksel** atau proporsional
- Tanda tangan yang sudah ada bisa di-replace kapan saja

---

## 9. Panel Admin — Konfigurasi Workflow

> **Hanya untuk role: `admin`**

Halaman: `/admin/workflows`

### Fungsi

Mengatur **approval chain** (rantai persetujuan) untuk setiap kategori dokumen.

### Melihat Workflow

1. Klik chip kategori di bagian atas (PO, CA, Petty Cash, Memo)
2. Workflow yang dipilih menampilkan **chain visual**:

```
COST CONTROL  →  FINANCIAL CONTROLLER  →  HOTEL MANAGER  →  KIC
   Step 1              Step 2                 Step 3        Step 4
```

3. Setiap step menampilkan:
   - **Role** yang dibutuhkan (UPPERCASE)
   - **Nomor step** (urutan)

### Mengelola Workflow

- Klik **"Add Step"** untuk menambah langkah approval baru
- Klik **"Edit Chain"** untuk mengubah urutan/role
- Klik **"New Workflow"** untuk membuat workflow baru

---

## 10. Panel Admin — Keyword Configuration

> **Hanya untuk role: `admin`**

Halaman: `/admin/keywords`

### Fungsi

Mengatur **mapping keyword** untuk penempatan tanda tangan otomatis pada PDF. Sistem akan mencari teks tertentu (keyword) dalam PDF dan menempatkan tanda tangan di dekat keyword tersebut.

### Contoh Mapping

| Document Category | Role | Keyword |
|-------------------|------|---------|
| Purchase Order | COST CONTROL | "Diperiksa oleh" |
| Purchase Order | FINANCIAL CONTROLLER | "Disetujui oleh" |
| Purchase Order | HOTEL MANAGER | "Diketahui oleh" |

### Cara Konfigurasi

1. Tabel menampilkan semua mapping yang aktif
2. Klik **"Add Mapping"** untuk membuat mapping baru
3. Setiap mapping menampilkan:
   - **Document Category** — Badge warna kategori
   - **Role** — Role approver
   - **Keyword** — Teks yang dicari di PDF
   - **Position Hint** — Petunjuk posisi (otomatis)
4. Gunakan tombol ✏️ Edit atau 🗑️ Delete untuk mengelola mapping

---

## 11. Panel Admin — Delegasi & Absensi

> **Hanya untuk role: `admin`**

Halaman: `/admin/delegation`

### Fungsi

Mengatur delegasi approval ketika seorang approver **tidak hadir** (cuti, sakit, tugas luar). Approval yang seharusnya ditujukan kepada approver tersebut akan dialihkan ke delegasi (pengganti).

### Membuat Delegasi

1. Klik **"Set Absence"** (kanan atas)
2. Pilih user yang tidak hadir
3. Pilih user pengganti (delegasi)
4. Tentukan tanggal mulai dan perkiraan kembali

### Kartu Delegasi Aktif

Setiap delegasi yang aktif ditampilkan sebagai kartu yang menunjukkan:
- User yang absen → User pengganti
- Tanggal mulai absen
- Perkiraan tanggal kembali
- Jumlah item pending yang sudah dialihkan
- Tombol **"Edit"** dan **"Mark as Returned"**

### Tips

- Klik **"Mark as Returned"** ketika user sudah kembali bertugas
- Delegasi otomatis digunakan saat ada approval baru yang masuk

---

## 12. Pengaturan Akun (Settings)

Halaman: `/settings` (tersedia untuk semua user)

### Bagian Profile

| Field | Deskripsi | Bisa diubah? |
|-------|-----------|-------------|
| Display Name | Nama tampilan Anda | ✅ Ya |
| Email | Alamat email | ❌ Tidak (hanya baca) |
| Change Password | Ganti password saat ini | ✅ Ya |

Klik **"Save Profile"** setelah mengubah nama atau password.

### Bagian Notifications

| Pengaturan | Deskripsi | Default |
|------------|-----------|---------|
| Email on approval request | Notifikasi saat ada dokumen perlu Anda setujui | ✅ Aktif |
| Email on rejection | Notifikasi saat dokumen Anda ditolak | ✅ Aktif |
| Daily digest | Ringkasan harian semua aktivitas dokumen | ❌ Nonaktif |

### Bagian Display

| Pengaturan | Opsi |
|------------|------|
| Language | Bahasa Indonesia, English |
| Items per page | 10, 25, 50 |

---

## 13. Navigasi Sidebar & Branch Selector

### Sidebar

Sidebar tampil di sisi kiri layar. Menu yang terlihat bergantung pada role Anda.

**Bagian "Main":**
- 📊 Dashboard — Ringkasan operasional
- 📄 Documents — Daftar semua dokumen
- ⬆️ Upload — Upload dokumen baru (hanya Initiator/Purchasing/Admin)
- ✅ My Approvals — Daftar approval (hanya Approver/Admin)

**Bagian "Administration" (Admin only):**
- 👥 Users — Manajemen user
- ✍️ Signatures — Manajemen tanda tangan
- 🔀 Workflows — Konfigurasi alur approval
- 🔍 Keywords — Mapping keyword signature
- 🔄 Delegation — Delegasi absensi

**Bagian "Account":**
- ⚙️ Settings — Pengaturan akun

### Branch Selector

Di bagian atas sidebar, terdapat **dropdown Branch Selector**:
- Pilih cabang hotel yang ingin Anda lihat/kelola
- Opsi: **Astara Hotel** atau **Pentacity Hotel**

### Sidebar Collapse

- Klik tombol **`«`** di bagian bawah sidebar untuk meminimalkan sidebar
- Klik **`»`** untuk mengembalikan sidebar
- Di perangkat mobile, sidebar muncul sebagai overlay

---

## 14. FAQ & Troubleshooting

### Q: Saya lupa password, bagaimana cara reset?

**A:** Hubungi Admin untuk di-reset password Anda melalui halaman User Management.

### Q: Saya tidak bisa melihat menu "My Approvals"

**A:** Menu ini hanya tersedia untuk role yang memiliki hak approval: `cost_control`, `financial_controller`, `hotel_manager`, `kic`, dan `admin`. Hubungi Admin jika role Anda perlu diubah.

### Q: Dokumen saya sudah di-upload tapi tidak ada approver yang memprosesnya

**A:** Beberapa kemungkinan:
1. Belum ada workflow yang dikonfigurasi untuk kategori tersebut → Hubungi Admin
2. Belum ada user dengan role yang sesuai di branch tersebut → Hubungi Admin
3. Approver sedang absen dan belum diatur delegasinya → Hubungi Admin

### Q: Tanda tangan tidak muncul di PDF setelah approval

**A:** Pastikan:
1. Tanda tangan (PNG) sudah diupload di halaman Signatures
2. Keyword mapping sudah dikonfigurasi untuk kategori + role tersebut
3. Keyword yang dikonfigurasi benar-benar ada di dalam teks PDF

### Q: Bagaimana format Document ID dan Nama File Akhir?

**A:** Format Document ID: `[PREFIX]-[TAHUN]-[NOMOR]`
- PO → `PO-2026-XXXX`
- CA → `CA-2026-XXXX`
- Petty Cash → `PC-2026-XXXX`
- Memo → `MM-2026-XXXX`

Nama file akhir (PDF) yang tersimpan akan mengikuti nama asli dokumen yang Anda upload, disanitasi dari karakter khusus, dan ditambahkan `DisplayID` ini. 
Contoh: `Invoice_Vendor_A_PO-2026-0042.pdf`

### Q: Apa yang terjadi jika saya reject dokumen di tengah approval chain?

**A:** Dokumen **langsung** berubah status menjadi `REJECTED`. Step-step berikutnya tidak akan diproses. Uploader perlu mengupload ulang dokumen yang sudah diperbaiki.

### Q: Bisakah file selain PDF diupload?

**A:** Tidak, saat ini sistem **hanya menerima file PDF** (`.pdf`).

### Q: Berapa lama sesi login berlaku?

**A:** Sesi login berlaku **7 hari**. Setelah itu, Anda perlu login kembali.

---

## 15. Panduan Admin IT — Deployment & Troubleshooting

> **Hanya untuk role: `Administrator Server / IT Support`**

Bab ini berisi panduan teknis esensial untuk mengoperasikan server Node.js di environment production (Windows Server) dan mengatasi berbagai isu infrastruktur.

### 15.1. Cara Menyalakan Server dari Awal (Cold Start)

Jika server fisik baru saja di-restart atau aplikasi mati sepenuhnya, ikuti langkah berikut untuk menyalakan kembali DMS:

1. Buka aplikasi terminal/command prompt (**PowerShell**) sebagai Administrator.
2. Navigasi ke direktori utama aplikasi DMS:
   ```powershell
   cd D:\DMS
   ```
3. *(Opsional)* Jika ada perubahan kosmetik/fitur di frontend React, pastikan Anda mem-build ulang versi produksinya terlebih dahulu:
   ```powershell
   npm run build --workspace=packages/web
   ```
4. Jalankan (start) server backend Node.js. Pastikan menggunakan parameter `--env-file` untuk memuat environment variables produksi:
   ```powershell
   node --env-file=packages/server/.env packages/server/src/index.js
   ```
5. Server akan aktif. Biarkan jendela terminal tetap terbuka, atau gunakan *Process Manager* seperti PM2 (jika terinstal) agar berjalan di background.

### 15.2. Troubleshooting: "ERR_CONNECTION_REFUSED" dari Komputer Lain

**Gejala:** 
Aplikasi bisa dibuka di server itu sendiri (`http://localhost:3001`), namun ketika komputer lain di Intranet (LAN) mencoba mengakses via IP Server (contoh: `http://192.168.0.100:3001`), browser menampilkan error `ERR_CONNECTION_REFUSED`.

**Penyebab:**
Web server Node.js secara bawaan (default) hanya "mendengarkan" koneksi pada interface lokal (`127.0.0.1` / `localhost`). Sehingga koneksi dari luar (IP LAN) otomatis ditolak oleh Node.

**Solusi:**
Pastikan blok kode pembuka (listen) server di `packages/server/src/index.js` secara eksplisit menulis parameter host `"0.0.0.0"`. Angka "0" berarti mendengarkan _semua_ interface jaringan server, tidak peduli apa IP-nya:

```javascript
// Di dalam file: packages/server/src/index.js
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DMS Server] Running on http://192.168.0.100:${PORT} (Bound to 0.0.0.0)`);
});
```
*Jangan lupa merestart process node Anda setelah mengubah file ini.*

### 15.3. Troubleshooting: PDF Kosong (Blank Preview) & Isu NAS Storage

**Gejala:** 
Saat membuka menu persetujuan atau detail dokumen, iframe yang seharusnya memuat file PDF muncul berupa layar hitam/kosong. Jika diklik tombol download, filenya corrupt atau 0 bytes. Ini sering terjadi pasca-migrasi direktori storage (folder penyimpanan).

**Penyebab & Solusi:**
Karena file tidak lagi berada lokal melainkan dipindah ke Network Attached Storage (NAS/Z: Drive), sistem frontend tidak bisa lagi menebak (hardcode) letak file via URL statis `http://localhost/storage`. 

1. **Konfigurasi Path NAS (Slash Arah Maju)**
   Buka file `packages/server/.env` dan atur path ke drive NAS Anda. Di dalam ekosistem Node.js, gunakan garis miring maju `/` (forward slash) pada Windows sekalipun, karena lebih minim error:
   ```env
   DOCUMENT_STORAGE_PATH=Z:/DMS/documents
   SIGNATURE_STORAGE_PATH=Z:/DMS/signatures
   ```

2. **Gunakan Streaming API Khusus Frontend**
   Aplikasi kita telah di-patch untuk menggunakan route Backend internal yang mendownload/streaming binary secara aman:
   ```
   GET /api/documents/:id/file
   ```
   *Note Internal: Route ini menangani konversi path database absolut vs relatif dan mensupport NAS secara otomatis. Iframe React memanggil API ini, menyuntikkan kredensial sesi Better Auth, lalu menampilkan hasil stream secara blob data.*

---

> 📌 **Butuh Bantuan?** Hubungi Administrator Sistem Teknis pusat atau kirim email ke it@astarahotel.com
> 
> _Untuk referensi kode & arsitektur asli, lihat [Master Documentation](./MASTER_DOCUMENTATION.md) atau [Product Requirements Document (PRD)](./PRD.md)._
