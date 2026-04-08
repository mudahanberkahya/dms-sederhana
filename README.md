# DMS — Document Management System

> Sistem manajemen dokumen internal hotel (Astara Hotel & Pentacity Hotel).

## Struktur Proyek

Monorepo dengan dua package utama:
- `packages/web` — Frontend (Vite + React, built to `dist/`)
- `packages/server` — Backend API (Express + Drizzle ORM + Better Auth, port **3001**, juga melayani frontend)

> **Catatan:** Dalam mode production, frontend di-build dan dilayani oleh Express di port 3001. Semua akses melalui satu URL.

## Prerequisites

| Tool | Versi |
|------|-------|
| **Node.js** | ≥ 20 (install via [NVM](https://github.com/nvm-sh/nvm)) |
| **PostgreSQL** | Lokal (Postgres.app / Docker) |
| **Python** | Python 3.x untuk PDF signature stamping (PyMuPDF). *Pastikan dijalankan sebagai `python` bukan `python3` di Windows.* |

## Setup Awal

### 1. Clone & Install Dependencies
```bash
git clone <repo-url> DMS
cd DMS
npm install
```

### 2. Konfigurasi Environment
Buat file `packages/server/.env`:
```env
PORT=3001
BETTER_AUTH_SECRET=dms_secret_super_secure_key_123!
BETTER_AUTH_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dms_db
DOCUMENT_STORAGE_PATH=./storage/documents
SIGNATURE_STORAGE_PATH=./storage/signatures
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5174
```

### 3. Setup Database
```bash
# Buat database
createdb dms_db

# Push schema ke database
cd packages/server
npx drizzle-kit push --force

# Seed user Super Admin
node scripts/seed.js
```

### 4. Install PyMuPDF (untuk fitur signature stamp)
```bash
pip install PyMuPDF
```

## Menjalankan Aplikasi

### Production Mode (Recommended)

Frontend dilayani oleh Express server di port 3001.

```bash
# Build frontend
npm run build --workspace=packages/web

# Jalankan server (dari root project)
node --env-file=packages/server/.env packages/server/src/index.js
```
Aplikasi aktif di: `http://localhost:3001`

### Development Mode (Hot Reload)

> ⚠️ Jalankan **kedua** server secara bersamaan di terminal terpisah.

#### Terminal 1 — Backend Server
```bash
node --env-file=packages/server/.env packages/server/src/index.js
```
Server aktif di: `http://localhost:3001`

#### Terminal 2 — Frontend Web App
```bash
npm run dev --workspace=packages/web
```
Frontend aktif di: `http://localhost:5174`

## Login Default

| Email | Password | Role |
|-------|----------|------|
| `nawawi@astarahotel.com` | `password123` | Admin |

> Semua user default menggunakan password: `password123`

## Struktur Storage

```
packages/server/storage/
├── documents/          # Base folder PDF dokumen
│   ├── pending/        # Dokumen baru diupload dan menunggu full approval
│   │   └── {Branch}/   # Contoh: /pending/Astara_Hotel/
│   ├── approved/       # Dokumen yang sudah fully approved (beserta versi original)
│   │   └── {Branch}/   # Contoh: /approved/Astara_Hotel/
│   └── rejected/       # (Opsional) Dokumen yang ditolak
└── signatures/         # File PNG tanda tangan digital per user
```

### Format Penamaan File
- **Upload baru (di folder `pending`)**: `{NamaFileAsli_Sanitized}_{DisplayId}.pdf` (contoh: `Invoice_Vendor_PO-2026-1234.pdf`)
- **File signed (di folder `approved`)**: `{NamaFileAsli_Sanitized}_{DisplayId}_signed.pdf` (contoh: `Invoice_Vendor_PO-2026-1234_signed.pdf`)

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-step Approval** | Workflow bertingkat per kategori dokumen |
| **Digital Signature** | Stamp PNG otomatis ke PDF saat approval |
| **Role-Based Access** | Akses menu berdasarkan role user |
| **Delegasi** | Alih tugas approval saat user absen |
| **Notes** | Catatan dari uploader untuk approver |
| **Admin Panel** | Kelola user, workflow, signature, keyword |
| **Delete Document** | Admin dapat menghapus dokumen |
| **Smart Sorting** | Dokumen PENDING selalu tampil teratas |

## npm Scripts

| Scope | Command | Deskripsi |
|-------|---------|-----------|
| Root | `npm run build --workspace=packages/web` | Build frontend production |
| Root | `npm run dev --workspace=packages/web` | Dev server frontend |
| Server | `node --env-file=packages/server/.env packages/server/src/index.js` | Jalankan backend (production) |
| Server | `npm run db:generate` | Generate migration |
| Server | `npm run db:migrate` | Jalankan migration |
| Server | `npm run db:push` | Push schema langsung ke DB |

## Utility Scripts

| Script | Lokasi | Fungsi |
|--------|--------|--------|
| `seed.js` | `packages/server/scripts/` | Buat Super Admin user |
| `reset_docs.js` | Root project | Reset dokumen & approval ke PENDING |
| `reset_passwords.js` | Root project | Reset password admin ke `password123` |
| `stamp_pdf.py` | `packages/server/scripts/` | Stamp signature ke PDF (PyMuPDF) |

## Dokumentasi Lengkap

- **[Product Requirements Document (PRD)](docs/PRD.md)** — Objektif, scope bisnis, dan fungsionalitas utama sistem
- **[Master Documentation](docs/MASTER_DOCUMENTATION.md)** — Arsitektur, schema, API, dan konfigurasi teknis
- **[Panduan Penggunaan](docs/PANDUAN_PENGGUNAAN.md)** — Panduan user lengkap per fitur
- **[Product Specification](docs/PRODUCT_SPECIFICATION.md)** — Spesifikasi produk teknis lengkap
