# 📘 DMS — Master Documentation

> **Document Management System** untuk operasional hotel (Astara Hotel & Pentacity Hotel).  
> Versi: 1.1.0 | Terakhir diperbarui: 10 Maret 2026

---

## Daftar Isi

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Arsitektur & Tech Stack](#2-arsitektur--tech-stack)
3. [Struktur Proyek](#3-struktur-proyek)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Sistem Autentikasi](#6-sistem-autentikasi)
7. [Alur Approval & Workflow](#7-alur-approval--workflow)
8. [Fitur Auto-Signature (PDF Stamping)](#8-fitur-auto-signature-pdf-stamping)
9. [Role & Permission](#9-role--permission)
10. [Environment Setup](#10-environment-setup)
11. [Menjalankan Aplikasi](#11-menjalankan-aplikasi)
12. [Scripts & Tools](#12-scripts--tools)

---

## 1. Ringkasan Sistem

DMS adalah aplikasi web internal untuk mengelola dokumen operasional hotel. Dokumen yang dikelola meliputi:

| Kategori | Kode | Deskripsi |
|----------|------|-----------|
| **Purchase Order** | PO | Dokumen pembelian / pengadaan barang |
| **Cash Advance** | CA | Dokumen permintaan uang muka |
| **Petty Cash** | PC | Dokumen pengeluaran kas kecil |
| **Memo** | MM | Dokumen memo internal |

Setiap dokumen yang diupload melewati **alur persetujuan bertingkat** (multi-step approval workflow) yang dikonfigurasi per kategori dokumen. Dokumen yang disetujui secara otomatis **ditandatangani digital** (signature stamp pada PDF).

### Cabang (Branch)

Sistem mendukung multi-branch:
- **Astara Hotel**
- **Pentacity Hotel**

---

## 2. Arsitektur & Tech Stack

```
┌─────────────────────────┐     ┌──────────────────────────┐
│    Frontend (Web)       │     │    Backend (Server)      │
│    React + Vite         │────▶│    Express.js            │
│    Build → dist/        │     │    Port: 3001            │
│    React Router v7      │     │    Drizzle ORM           │
│    Lucide React Icons   │     │    Better Auth           │
└─────────────────────────┘     │    Multer (File Upload)  │
                                │    Helmet (Security)     │
                                │    Serves static web UI  │
                                └──────────┬───────────────┘
                                           │
                                ┌──────────▼───────────────┐
                                │    PostgreSQL Database    │
                                │    astara_dms             │
                                └──────────────────────────┘
```

> **Catatan Arsitektur:** Dalam mode production, frontend di-build menjadi file statis (`packages/web/dist/`) dan dilayani langsung oleh Express di port **3001**. Host server Node di-bind secara eksplisit ke `"0.0.0.0"` agar dapat menerima koneksi lintas-jaringan dari alamat IP Intranet (misal: `192.168.0.100`).

### Frontend (`packages/web`)

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | 19.2 | UI Framework |
| Vite | 7.3 | Build Tool & Dev Server |
| React Router | 7.13 | Client-side Routing |
| Lucide React | 0.575 | Icon Library |

### Backend (`packages/server`)

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Express.js | 4.21 | Web Framework |
| Drizzle ORM | 0.40 | Database ORM |
| Better Auth | 1.1 | Authentication (email + password, session cookie) |
| Multer | 1.4 | Multipart file upload (PDF & images) |
| Helmet | 8.0 | HTTP Security Headers |
| pg (node-postgres) | 8.13 | PostgreSQL Driver |

---

## 3. Struktur Proyek

```
DMS/                              # Root (npm workspaces)
├── package.json                  # Workspace configuration
├── packages/
│   ├── server/                   # Backend API
│   │   ├── .env                  # Environment variables
│   │   ├── drizzle.config.js     # Drizzle Kit configuration
│   │   ├── package.json
│   │   ├── scripts/
│   │   │   ├── seed.js           # Seed super admin user
│   │   │   ├── check_user.js     # Utility: check user in DB
│   │   │   ├── stamp_pdf.py      # Python: PDF signature stamping
│   │   │   ├── make_test_pdf.py  # Python: generate test PDF
│   │   │   └── make_test_sig.py  # Python: generate test signature
│   │   └── src/
│   │       ├── index.js          # Express app entry point
│   │       ├── auth.js           # Better Auth configuration
│   │       ├── db/
│   │       │   ├── index.js      # Drizzle + pg pool setup
│   │       │   └── schema.js     # All table definitions
│   │       ├── middleware/        # Express middlewares
│   │       ├── routes/
│   │       │   ├── documents.route.js
│   │       │   ├── approvals.route.js
│   │       │   ├── workflows.route.js
│   │       │   ├── users.route.js
│   │       │   ├── signatures.route.js
│   │       │   └── keywords.route.js
│   │       └── services/
│   │           ├── document.service.js
│   │           ├── approval.service.js
│   │           ├── workflow.service.js
│   │           ├── user.service.js
│   │           ├── signature.service.js
│   │           ├── keyword.service.js
│   │           └── pdf.service.js
│   └── web/                      # Frontend SPA
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── main.jsx          # React entry point
│           ├── App.jsx           # Routes & AppContext
│           ├── index.css         # Global styles
│           ├── lib/
│           │   ├── api.js        # API client (fetch wrapper)
│           │   └── auth.js       # Better Auth client
│           ├── layouts/
│           │   ├── Layout.jsx    # Main layout (Sidebar + Navbar)
│           │   └── Layout.css
│           ├── components/
│           │   ├── Sidebar.jsx   # Navigation sidebar
│           │   ├── Sidebar.css
│           │   ├── Navbar.jsx    # Top navbar
│           │   └── Navbar.css
│           └── pages/
│               ├── Login.jsx          # Halaman Login
│               ├── Dashboard.jsx      # Dashboard statistik
│               ├── Documents.jsx      # Daftar dokumen
│               ├── DocumentDetail.jsx # Detail & approval dokumen
│               ├── Upload.jsx         # Upload dokumen (3 step)
│               ├── Approvals.jsx      # Daftar approval pending
│               ├── Users.jsx          # Manajemen user [ADMIN]
│               ├── Signatures.jsx     # Manajemen tanda tangan [ADMIN]
│               ├── Workflows.jsx      # Konfigurasi workflow [ADMIN]
│               ├── Keywords.jsx       # Mapping keyword→role [ADMIN]
│               ├── Delegation.jsx     # Delegasi absensi [ADMIN]
│               ├── AuditTrail.jsx     # Manajemen log aktivitas [ADMIN]
│               ├── AuditTrail.css
│               └── Settings.jsx       # Pengaturan akun
```

---

## 4. Database Schema

Database menggunakan **PostgreSQL** dengan **Drizzle ORM**. Schema didefinisikan di `packages/server/src/db/schema.js`.

### Tabel Inti (Better Auth)

| Tabel | Deskripsi |
|-------|-----------|
| `user` | Data user (id, name, email, role, banned status) |
| `session` | Session aktif (token, expiry, user agent) |
| `account` | Credential provider (password hash) |
| `verification` | Token verifikasi email |

### Tabel Bisnis DMS

| Tabel | Deskripsi |
|-------|-----------|
| `user_profile` | Profil tambahan: branch, department, status absensi, delegasi |
| `department_ref` | Daftar referensi dari kode dan nama Departemen |
| `document` | Dokumen yang diupload (displayId, category, branch, department, filePath, status) |
| `workflow` | Definisi workflow per kategori + branch |
| `workflow_step` | Langkah-langkah dalam workflow (stepOrder, roleRequired) |
| `approval` | Instance approval per dokumen (status, assignedUser, delegasi) |
| `signature` | Gambar tanda tangan digital (PNG) per user |
| `keyword_mapping` | Mapping keyword→role untuk penempatan signature otomatis pada PDF |
| `activity_log` | Log aktivitas sistem (upload, approval, etc.) |

### Entity Relationship

```mermaid
erDiagram
    user ||--o{ user_profile : has
    user ||--o{ document : uploads
    user ||--o{ signature : has
    user ||--o{ approval : "assigned to"
    document ||--o{ approval : has
    workflow ||--o{ workflow_step : contains
    workflow }o--|| document : "applied to"
    keyword_mapping }o--|| approval : "guides signature"
    user ||--o{ activity_log : performs
    activity_log }o--|| document : references
```

### Kolom Penting — Tabel `document`

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `display_id` | VARCHAR(50) | ID tampilan (e.g. `PO-2026-0042`) |
| `title` | TEXT | Nama file |
| `category` | VARCHAR(50) | Kategori dokumen |
| `branch` | VARCHAR(255) | Cabang hotel |
| `department` | VARCHAR(100) | Pengaturan identitas departemen pengunggah dokumen |
| `file_path` | TEXT | Path file PDF asli |
| `signed_file_path` | TEXT | Path file PDF yang sudah ditandatangani |
| `status` | VARCHAR(50) | `PENDING` / `APPROVED` / `REJECTED` |
| `notes` | TEXT | Catatan opsional dari uploader untuk approver |
| `uploaded_by` | TEXT (FK→user) | User yang mengupload |

### Kolom Penting — Tabel `approval`

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `document_id` | UUID (FK→document) | Dokumen terkait |
| `step_order` | INTEGER | Urutan langkah approval |
| `role_required` | VARCHAR(100) | Role yang dibutuhkan |
| `assigned_user_id` | TEXT (FK→user) | User yang ditugaskan |
| `status` | VARCHAR(50) | `PENDING` / `APPROVED` / `REJECTED` / `LOCKED` |
| `delegated_from_user_id` | TEXT (FK→user) | Jika didelegasikan |
| `acted_by_user_id` | TEXT (FK→user) | User yang melakukan aksi |
| `signed_at` | TIMESTAMP | Waktu penandatanganan |

---

## 5. API Endpoints

Base URL: `http://localhost:3001/api`

### Authentication (Better Auth)

| Method | Path | Deskripsi |
|--------|------|-----------|
| ALL | `/api/auth/*` | Ditangani oleh Better Auth (sign in, sign up, session) |

### Documents

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/documents` | Daftar semua dokumen (urut: PENDING → APPROVED → REJECTED) |
| GET | `/api/documents/:id` | Detail dokumen + approval chain |
| POST | `/api/documents` | Upload dokumen baru (multipart/form-data) |
| DELETE | `/api/documents/:id` | Hapus dokumen **(Admin only)** |

### Approvals

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/approvals/pending` | Daftar approval yang menunggu aksi user |
| POST | `/api/approvals/:id/action` | Approve atau Reject (body: `{ action, comment }`) |

### Admin — Users

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/admin/users` | Daftar semua user |
| POST | `/api/admin/users` | Buat user baru |
| POST | `/api/admin/users/:id/delegation` | Set delegasi user |

### Admin — Workflows

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/admin/workflows/:category` | Dapatkan workflow + steps |
| POST | `/api/admin/workflows` | Simpan/update workflow |

### Admin — Signatures

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/admin/signatures` | Daftar semua signature |
| POST | `/api/admin/signatures` | Upload signature (multipart/form-data) |

### Admin — Keywords

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/admin/keywords` | Daftar keyword mappings |
| POST | `/api/admin/keywords` | Tambah keyword mapping |
| DELETE | `/api/admin/keywords/:id` | Hapus keyword mapping |

### Admin — Activity Logs

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/logs` | Fetch system-wide activity logs (pagination + filters) |

### Health Check

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Status server |

---

## 6. Sistem Autentikasi

Aplikasi menggunakan **Better Auth** dengan metode **email + password**. Session disimpan sebagai **cookie HTTP-only** dengan masa berlaku **7 hari**.

### Alur Login

```
Browser → POST /api/auth/sign-in → Better Auth → Set Cookie → Redirect ke Dashboard
```

### Konfigurasi Penting

- **CORS**: Origin `http://localhost:3001` (production) dan `http://localhost:5174` (development) diizinkan dengan `credentials: true`
- **Trusted Origins**: Dikonfigurasi di `auth.js` dan `.env` (`BETTER_AUTH_TRUSTED_ORIGINS`)
- **Plugin Admin**: Mengaktifkan field `role` di tabel user
- **TestSprite Origins**: `*.testsprite.com` ditambahkan untuk mendukung automated testing

---

## 7. Alur Approval & Workflow

### Konsep

Setiap **kategori dokumen** memiliki **workflow** yang terdiri dari beberapa **step**. Setiap step membutuhkan role tertentu untuk melakukan approval.

### Contoh Workflow PO

```
Initiator Upload → Cost Control → Financial Controller → Hotel Manager → KIC
      ↓                 ↓                  ↓                   ↓           ↓
   PENDING          PENDING→APPROVED   LOCKED→PENDING      LOCKED      LOCKED
```

### Mekanisme Detail

1. **Upload**: Initiator upload dokumen → status `PENDING`, approval chain dibuat
2. **Step 1 aktif**: Step pertama status `PENDING`, step lainnya `LOCKED`
3. **Assign otomatis**: Sistem mencari user dengan role yang sesuai di branch tersebut
4. **Delegasi**: Jika user yang dituju `isAbsent = true`, approval dialihkan ke `delegatedToUserId`
5. **Approve**: Step saat ini → `APPROVED`, step berikutnya → `PENDING`
6. **Reject**: Step saat ini → `REJECTED`, dokumen langsung → `REJECTED`
7. **Step terakhir disetujui**: Dokumen → `APPROVED` + PDF ditandatangani

### Delegasi (Absence)

Ketika user approver tidak hadir (cuti/sakit), admin dapat mengatur delegasi:

| Field | Deskripsi |
|-------|-----------|
| `user_profile.is_absent` | `true` jika user sedang tidak hadir |
| `user_profile.delegated_to_user_id` | User pengganti yang menerima approval |
| `user_profile.absence_start_date` | Tanggal mulai absen |
| `user_profile.absence_end_date` | Tanggal perkiraan kembali |

---

## 8. Fitur Auto-Signature (PDF Stamping)

Ketika approver menyetujui dokumen, sistem secara otomatis menempelkan tanda tangan digital pada PDF.

### Mekanisme

1. Admin upload gambar tanda tangan (PNG) untuk setiap approver
2. Admin konfigurasi **keyword mapping**: menghubungkan `category + role → keyword`
3. Saat approval, sistem:
   - Menemukan signature image milik approver
   - Menemukan keyword yang sesuai (dari `keyword_mapping`)
   - Memindai PDF untuk menemukan posisi keyword tersebut
   - Menempelkan gambar signature di dekat keyword

### Tabel `keyword_mapping`

| Kolom | Contoh |
|-------|--------|
| `category` | Purchase Order |
| `role` | cost_control |
| `keyword` | "Diperiksa oleh" |
| `position_hint` | Below table |

---

## 9. Role & Permission

### Daftar Role

| Role | Deskripsi | Akses |
|------|-----------|-------|
| `admin` | Administrator sistem | Semua fitur + panel admin |
| `initiator` | Staff yang mengupload dokumen | Dashboard, Documents, Upload |
| `purchasing` | Bagian Purchasing | Dashboard, Documents, Upload |
| `cost_control` | Cost Control | Dashboard, Documents, Approvals |
| `financial_controller` | Financial Controller | Dashboard, Documents, Approvals |
| `hotel_manager` | Hotel Manager | Dashboard, Documents, Approvals |
| `kic` | KIC (Key Internal Control) | Dashboard, Documents, Approvals |

### Navigasi Sidebar per Role

**Semua User:**
- Dashboard
- Documents
- Settings

**Initiator, Purchasing:**
- Upload (tambahan)

**Cost Control, Financial Controller, Hotel Manager, Admin:**
- My Approvals (tambahan)

**Admin Only:**
- Users, Signatures, Workflows, Keywords, Delegation, Audit Trail

---

## 10. Environment Setup

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (lokal via Postgres.app atau Docker)
- **Python 3** (opsional, untuk script PDF stamping)

### Konfigurasi Environment

File: `packages/server/.env`

```env
PORT=3001

# Better Auth
BETTER_AUTH_SECRET=<secret_key_anda>
BETTER_AUTH_URL=http://192.168.0.100:3001
BETTER_AUTH_TRUSTED_ORIGINS=http://192.168.0.100:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dms_db

# Storage (Gunakan Forward Slash (/) untuk kompatibilitas NAS Drive)
DOCUMENT_STORAGE_PATH=Z:/DMS/documents
SIGNATURE_STORAGE_PATH=Z:/DMS/signatures
```

### Struktur Storage

```
storage/
├── documents/          # Base folder PDF dokumen
│   ├── pending/        # Dokumen baru diupload dan menunggu full approval
│   │   └── {Branch}/   # Contoh: /pending/Astara_Hotel/
│   ├── approved/       # Dokumen yang sudah fully approved (termasuk original & signed)
│   │   └── {Branch}/   # Contoh: /approved/Astara_Hotel/
│   └── rejected/       # Dokumen ditolak
│       └── {Branch}/   # Contoh: /rejected/Astara_Hotel/
└── signatures/         # PNG tanda tangan per user
```

### Format Penamaan File

| Tipe | Format | Contoh |
|------|--------|--------|
| Upload baru (pending) | `{NamaFileAsli_Sanitized}_{DisplayId}.pdf` | `invoice_2026_PO-2026-1234.pdf` |
| File signed (approved) | `{NamaFileAsli_Sanitized}_{DisplayId}_signed.pdf` | `invoice_2026_PO-2026-1234_signed.pdf` |

### Setup Database

```bash
# Buat database PostgreSQL
createdb dms_db

# Generate & migrate schema
cd packages/server
npx drizzle-kit generate
npx drizzle-kit migrate

# Seed super admin
node scripts/seed.js
```

---

## 11. Menjalankan Aplikasi

### Production Mode (Recommended)

Frontend di-build dan dilayani oleh Express server di port 3001.

```bash
# Build frontend
npm run build --workspace=packages/web

# Jalankan server (dari root project)
node --env-file=packages/server/.env packages/server/src/index.js
```

| Service | URL |
|---------|-----|
| Aplikasi (UI + API) | http://192.168.0.100:3001 |
| Auth API | http://192.168.0.100:3001/api/auth |
| Health Check | http://localhost:3001/api/health |

### Development Mode

```bash
# Terminal 1 — Backend
node --env-file=packages/server/.env packages/server/src/index.js

# Terminal 2 — Frontend (hot reload)
npm run dev --workspace=packages/web
```

| Service | URL |
|---------|-----|
| Frontend (dev) | http://localhost:5174 |
| Backend API | http://localhost:3001 |

### Login Default

| Email | Password | Role |
|-------|----------|------|
| `nawawi@astarahotel.com` | `password123` | Admin |

### Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

---

## 12. Scripts & Tools

### Server Scripts (`packages/server/scripts/`)

| Script | Fungsi | Cara Menjalankan |
|--------|--------|----------------|
| `seed.js` | Buat user Super Admin | `node scripts/seed.js` |
| `check_user.js` | Cek apakah user ada di DB | `node scripts/check_user.js` |
| `stamp_pdf.py` | Stamp signature ke PDF | `python scripts/stamp_pdf.py` |
| `make_test_pdf.py` | Generate PDF test | `python scripts/make_test_pdf.py` |
| `make_test_sig.py` | Generate signature test | `python scripts/make_test_sig.py` |

### Utility Scripts (Root)

| Script | Fungsi | Cara Menjalankan |
|--------|--------|----------------|
| `reset_docs.js` | Reset semua dokumen & approval ke PENDING | `node --env-file=packages/server/.env reset_docs.js` |
| `reset_passwords.js` | Reset password admin ke `password123` | `node --env-file=packages/server/.env reset_passwords.js` |

### npm Scripts

| Scope | Command | Deskripsi |
|-------|---------|-----------|
| Root | `npm run dev --workspace=packages/web` | Jalankan frontend dev server |
| Root | `npm run build --workspace=packages/web` | Build frontend untuk production |
| Server | `npm run dev` | Jalankan backend dengan nodemon |
| Server | `npm run start` | Jalankan backend (production) |
| Server | `npm run db:generate` | Generate migration dari schema |
| Server | `npm run db:migrate` | Jalankan database migration |
| Server | `npm run db:push` | Push schema langsung ke database |

---

> **Catatan**: Dokumentasi ini mencerminkan keadaan sistem per 10 Maret 2026.
> - Untuk rincian kebutuhan bisnis, lihat [PRD (Product Requirements Document)](./PRD.md).
> - Untuk panduan penggunaan dari perspektif pengguna, lihat [PANDUAN_PENGGUNAAN.md](./PANDUAN_PENGGUNAAN.md).
> - Untuk spesifikasi produk lengkap, lihat [PRODUCT_SPECIFICATION.md](./PRODUCT_SPECIFICATION.md).
