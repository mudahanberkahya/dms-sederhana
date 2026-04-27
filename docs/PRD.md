# 📄 Product Requirements Document (PRD)
**DMS — Document Management System**

> **Sistem Manajemen Dokumen Internal Hotel (Astara Hotel & Pentacity Hotel)**

---

## 1. Pendahuluan

### 1.1 Latar Belakang
Operasional hotel (Astara Hotel & Pentacity Hotel) memerlukan pengelolaan dokumen internal harian seperti Purchase Order (PO), Cash Advance (CA), Petty Cash, dan Memo. Proses saat ini membutuhkan alur persetujuan bertingkat yang rawan terhadap dokumen fisik yang tercecer, lambatnya persetujuan ketika pejabat berwenang tidak di tempat, dan sulitnya pelacakan status dokumen.

### 1.2 Tujuan Peluncuran
Document Management System (DMS) dibangun untuk:
1. Mendigitalkan pengajuan dan penyimpanan dokumen operasional hotel.
2. Menyediakan sistem alur persetujuan (approval workflow) bertingkat secara otomatis.
3. Memastikan dokumen tersertifikasi (dengan digital signature / stamp).
4. Menyediakan sistem delegasi persetujuan (absence delegation) agar operasional tidak terhambat.

## 2. Ruang Lingkup (Scope) & Target Pengguna

### 2.1 Ruang Lingkup Sistem
DMS mengelola siklus hidup dokumen dari pengajuan awal hingga disetujui, mencakup:
- Ekosistem Multi-Branch (Astara Hotel dan Pentacity Hotel).
- Kategori spesifik: Purchase Order (PO), Cash Advance (CA), Petty Cash (PC), Memo (MM).
- Format dokumen utama yang didukung: **PDF**.
- Sistem otentikasi role-based access control (RBAC).
- Sistem penempatan otomatis gambar tanda tangan (Signature Stamp) mendeteksi keyword di dalam file PDF dokumen asli.

### 2.2 Persona / Peran Pengguna (Roles)
1. **Initiator / Purchasing**: Staf yang menginisiasi atau mengunggah dokumen baru ke dalam sistem.
2. **Cost Control**: Posisi pertama di alur persetujuan keuangan.
3. **Financial Controller**: Posisi persetujuan tingkat lanjut (keuangan).
4. **Hotel Manager**: Manajemen eksekutif yang mereviu persetujuan dokumen.
5. **KIC (Key Internal Control)**: Auditor atau pengawas akhir.
6. **Administrator (Admin)**: IT/Admin yang mengelola akses pengguna, pengaturan alur persetujuan, manajemen tanda tangan staf, dan keyword mapping.

## 3. Fitur Utama & Functional Requirements

### 3.1 Manajemen Dokumen & Upload (Document Upload)
- **FR.1.1**: Sistem harus memungkinkan staf (Initiator) mengunggah dokumen berekstensi `.pdf`.
- **FR.1.2**: Sistem harus membatasi ukuran maksimal file PDF hingga 25 MB.
- **FR.1.3**: Pengguna harus menyertakan **Kategori** (PO, CA, PC, Memo), **Branch / Cabang** (Astara atau Pentacity), dan **Department** dari dokumen.
- **FR.1.4**: Sistem harus membuatkan Document ID unik secara otomatis menggunakan pola `[KODE_KATEGORI]-[TAHUN]-[NOMOR_TRANSAKSI]` (Contoh: `PO-2026-0042`).
- **FR.1.5**: Dokumen baru langsung dimasukkan ke status `PENDING` dan masuk ke rantai persetujuan berdasarkan kategori dan cabang.
- **FR.1.6**: Daftar dokumen diurutkan dengan status `PENDING` terlebih dahulu, kemudian `APPROVED`, lalu `REJECTED` — memastikan dokumen yang memerlukan aksi selalu terlihat di posisi atas.
- **FR.1.7**: **(Document Generation / DocGen)**: Sistem harus mengizinkan pengguna *generate* dokumen baku melalui ekstensi form *Template* di UI Create Document. Sistem secara mandiri mengisi variabel-variabel input ke kerangka PDF dasar menggunakan teknologi Native AcroForm injeksi (melalui `pdf-lib`). Fitur ini secara otomatis mengeksekusi Formula yang ditentukan Admin dan mewajibkan pengguna mengisi "Judul Dokumen" untuk disatukan dengan Nama Template. Jika PDF AST corrupt akibat *flattening*, ia harus mampu menggunakan skema fallback otomatis ke *Read-Only lock*.

### 3.2 Alur Persetujuan Bertingkat (Workflow Validation)
- **FR.2.1**: Sistem harus memproses alur persetujuan secara linier (step-by-step). Langkah selanjutnya hanya aktif jika langkah sebelumnya telah disetujui (Status langkah sebelumnya menjadi `APPROVED`).
- **FR.2.2**: Konfigurasi alur dapat diatur spesifik berdasarkan kategori dan branch melalui panel Administrator.
- **FR.2.3**: Pengguna dengan peran (role) yang tepat dapat `Approve` atau `Reject` dokumen di mana mereka ditugaskan.
- **FR.2.4**: Jika satu penolakan (Reject) terjadi di langkah manapun, status keseluruhan dokumen otomatis menjadi `REJECTED`.
- **FR.2.5**: *(HOD Routing/Isolasi)* Jika sistem menemui role persetujuan bertitel `HOD` di workflow, dokumen tersebut secara cerdas diproyeksikan dan diisolasi masuk hanya kepada _HOD_ yang bersemayam pada Departemen yang sama dengan atribut dokumen tersebut.

### 3.3 Penandatanganan Otomatis (Auto-Stamping / Digital Signature)
- **FR.3.1**: Ketika Approval Workflow pada posisi seorang approver disetujui, sistem harus membaca file PDF dan mencari teks spesifik (Keyword) di dalam isi dokumen.
- **FR.3.2**: Administrator harus dapat memetakan/mendefinisikan apa Keyword PDF untuk kombinasi (Kategori + Role), misalkan untuk PO + Role Cost Control -> Keywordnya "Diperiksa oleh".
- **FR.3.3**: Sistem harus menempatkan file gambar PNG Tanda Tangan (Signature) approver pada posisi (sekitar/di dekat) keyword yang ditemukan dalam file PDF.

### 3.4 Sistem Delegasi Khusus (Absence Delegation)
- **FR.4.1**: Administrator dapat menandai staf bahwa mereka sedang tidak hadir (isAbsent = true) pada rentang waktu tanggal tertentu.
- **FR.4.2**: Administrator harus dapat mendefinisikan pengguna delegasi (pengganti).
- **FR.4.3**: Jika Approver utama tidak hadir dan persetujuan masuk kepada mereka, sistem harus otomatis mengalihkan tugas persetujuan tersebut (Delegated) kepada pengguna pengganti.

### 3.5 Panel Administrator (Administration)
- **FR.5.1**: Admin dapat membuat dan mengelola pengguna.
- **FR.5.2**: Admin dapat mengunggah file tanda tangan PNG untuk tiap pengguna yang memiliki hak approval.
- **FR.5.3**: Admin dapat mendefinisikan dan merubah Alur Persetujuan (Workflow Configuration) yang terdiri dari sejumlah "Step".
- **FR.5.4**: Admin dapat menghapus dokumen yang tidak diperlukan (hard delete).
- **FR.5.5**: **(Template Management)**: Administrator dapat mengunggah PDF Dasar (bertipe AcroForm) dan sistem akan mengekstrak konfigurasinya secara otomatis. Administrator lalu diizinkan memberikan Custom Label, mengubah urutan form (Reorder), atau mendefinisikan rumus logika (Formula) secara visual tanpa pusing mengutak-atik JSON secara manual. Pengaturan ini mensterilisasi key tanpa izin dan mengkompilasinya dengan mulus.

## 4. Penutup (Non-Functional Requirements)

- **Platform & Kompatibilitas**: Aplikasi berbasis Web, diakses via Browser Desktop standar seperti Chrome/Edge.
- **Performa**: Rendering dokumen dapat dilihat langsung di sistem dengan dukungan pratinjau PDF browser bawaan.
- **Akses Control**: Terdapat proteksi layer dengan _Better Auth_, pengguna tidak boleh membuat akun sendiri, harus melalui Administrator (Admin-only). Data dipisahkan secara akses dan peran.
