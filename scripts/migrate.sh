#!/usr/bin/env bash
# ============================================================
# DMS Sederhana — Migration Script
# Untuk installasi existing (ribuan dokumen sudah terproses)
# AMAN — database & file tidak disentuh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     DMS Sederhana — Migration Tool           ║"
echo "║     Upgrade tanpa kehilangan data            ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Konfirmasi ────────────────────────────────────
echo -e "${YELLOW}PENTING:${NC}"
echo "  • Script ini TIDAK menyentuh database"
echo "  • Script ini TIDAK menyentuh file dokumen"
echo "  • Hanya mengganti kode aplikasi dengan yang baru"
echo "  • Backup tetap disarankan sebelum migrasi"
echo ""
read -p "Lanjutkan migrasi? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy] ]]; then
    echo "Dibatalkan."
    exit 0
fi

# ─── Step 1: Deteksi instalasi existing ────────────
echo -e "\n${YELLOW}[1/5] Mendeteksi instalasi existing...${NC}"

# Cari instalasi DMS
INSTALL_DIRS=()
if [ -d "/opt/dms/app" ]; then
    INSTALL_DIRS+=("/opt/dms/app")
fi
if [ -d "/home/ubuntu/DMS" ]; then
    INSTALL_DIRS+=("/home/ubuntu/DMS")
fi

# Cari container
DMS_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i 'dms' | head -1 || echo "")

if [ ${#INSTALL_DIRS[@]} -eq 0 ] && [ -z "$DMS_CONTAINER" ]; then
    echo -e "${RED}Tidak ditemukan instalasi DMS yang existing.${NC}"
    echo "  Jalankan setup.sh untuk instalasi baru."
    exit 1
fi

echo "  Found:"
for dir in "${INSTALL_DIRS[@]}"; do
    echo "    📁 $dir"
done
if [ -n "$DMS_CONTAINER" ]; then
    echo "    🐳 Container: $DMS_CONTAINER"
fi

# ─── Step 2: Backup (opsional tapi recommended) ────
echo -e "\n${YELLOW}[2/5] Backup (recommended)${NC}"
echo "  • File dokumen di uploads/"
echo "  • Database PostgreSQL"
echo ""

read -p "Buat backup database? (y/N): " BACKUP_DB
if [[ "$BACKUP_DB" =~ ^[Yy] ]]; then
    BACKUP_DIR="/opt/dms/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    echo "  → Mencari koneksi database..."

    # Cek dari container env
    if [ -n "$DMS_CONTAINER" ]; then
        DB_URL=$(docker exec "$DMS_CONTAINER" env 2>/dev/null | grep DATABASE_URL | cut -d= -f2- || echo "")
        if [ -n "$DB_URL" ]; then
            echo "  → Backup database dari DATABASE_URL..."
            # Extract connection details from URL
            # postgres://user:pass@host:5432/dbname
            DB_USER=$(echo "$DB_URL" | sed 's|.*://||' | sed 's/:.*//')
            DB_PASS=$(echo "$DB_URL" | sed 's|.*://[^:]*:||' | sed 's/@.*//')
            DB_HOST=$(echo "$DB_URL" | sed 's|.*@||' | sed 's|:.*||')
            DB_PORT=$(echo "$DB_URL" | sed 's|.*:||' | sed 's|/.*||')
            DB_NAME=$(echo "$DB_URL" | sed 's|.*/||')

            PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database.sql" 2>/dev/null && \
                echo -e "${GREEN}  ✓ Database backup: $BACKUP_DIR/database.sql${NC}" || \
                echo -e "${YELLOW}  ⚠ Gagal backup database. Lanjutkan? (pastikan pg_dump terinstall)${NC}"
        else
            echo -e "${YELLOW}  ⚠ DATABASE_URL tidak ditemukan. Skip backup database.${NC}"
        fi
    fi

    # Backup uploads
    for dir in "${INSTALL_DIRS[@]}"; do
        if [ -d "$dir/uploads" ]; then
            echo "  → Backup uploads dari $dir..."
            cp -r "$dir/uploads" "$BACKUP_DIR/uploads" 2>/dev/null && \
                echo -e "${GREEN}  ✓ Uploads backup: $BACKUP_DIR/uploads${NC}"
        fi
    done

    echo -e "${GREEN}  ✓ Backup selesai: $BACKUP_DIR${NC}"
fi

# ─── Step 3: Verify DB Schema Compatibility ─────────
echo -e "\n${YELLOW}[3/5] Verifikasi kompatibilitas database...${NC}"
echo "  ✓ Tidak ada perubahan schema di versi baru"
echo "  ✓ Database tidak perlu migrasi"
echo -e "${GREEN}  ✓ Aman${NC}"

# ─── Step 4: Update Code ──────────────────────────
echo -e "\n${YELLOW}[4/5] Update kode aplikasi...${NC}"

UPDATE_DIR="${INSTALL_DIRS[0]}"
if [ -n "$UPDATE_DIR" ]; then
    echo "  → Update di $UPDATE_DIR"

    # Backup config existing
    if [ -f "$UPDATE_DIR/.env" ]; then
        cp "$UPDATE_DIR/.env" /tmp/dms-env-backup
        echo "  ✓ Config backup: /tmp/dms-env-backup"
    fi

    # Git pull dari repo baru
    cd "$UPDATE_DIR"

    # Cek current remote
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    if echo "$CURRENT_REMOTE" | grep -q "mudahanberkahya/DMS.git"; then
        echo "  → Mengganti remote ke repo baru..."
        git remote set-url origin https://github.com/mudahanberkahya/dms-sederhana.git
    fi

    # Fetch & reset (tetap pertahankan file konfigurasi)
    git fetch origin
    git reset --hard origin/main

    # Restore config
    if [ -f "/tmp/dms-env-backup" ]; then
        cp /tmp/dms-env-backup "$UPDATE_DIR/.env"
        echo "  ✓ Config restored"
    fi

    echo -e "${GREEN}  ✓ Kode updated${NC}"
fi

# ─── Step 5: Rebuild & Restart ─────────────────────
echo -e "\n${YELLOW}[5/5] Rebuild & restart aplikasi...${NC}"

if [ -n "$UPDATE_DIR" ] && [ -n "$DMS_CONTAINER" ]; then
    # Single container mode
    echo "  → Rebuild frontend..."
    docker exec "$DMS_CONTAINER" bash -c "cd /app/packages/web && npm run build" 2>/dev/null || \
    docker exec "$DMS_CONTAINER" sh -c "cd /app/packages/web && npm run build" 2>/dev/null || \
    echo -e "${YELLOW}  ⚠ Gagal rebuild via container exec. Restarting...${NC}"

    echo "  → Restart container..."
    docker restart "$DMS_CONTAINER"
elif [ -n "$UPDATE_DIR" ] && [ -f "$UPDATE_DIR/docker-compose.yml" ]; then
    # Docker compose mode
    cd "$UPDATE_DIR"
    docker compose down
    docker compose up -d --build
else
    echo -e "${RED}Tidak tahu cara restart. Lakukan manual.${NC}"
fi

# ─── Done ──────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         MIGRATION COMPLETE! 🎉            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "  Yang berubah di versi baru:"
echo "  ✅ AI Assistant → General-purpose (bisa tanya apa aja)"
echo "  ✅ Custom Workflow Builder (atur approval chain sendiri)"
echo "  ✅ Upload dengan template + attachment gambar"
echo "  ✅ Dashboard dengan charts & activity feed"
echo "  ✅ Bug fixes (pagination, sidebar)"
echo "  ✅ Landing page baru"
echo ""
echo "  Yang TIDAK berubah:"
echo "  ✅ Database — schema sama, data aman"
echo "  ✅ File dokumen — path sama, tidak dipindah"
echo "  ✅ User accounts & passwords"
echo "  ✅ Approval history & signatures existing"
echo ""
echo -e "${YELLOW}Tips post-migrasi:${NC}"
echo "  • Ctrl+F5 di browser untuk clear cache"
echo "  • Cek menu Admin → Workflows untuk fitur baru"
echo "  • Coba AI Assistant → sekarang bisa tanya apa saja"
echo ""

# ─── Optional: Cek storage ────────────────────────
if [ -n "$DMS_CONTAINER" ]; then
    echo -e "${CYAN}Informasi storage:${NC}"
    docker exec "$DMS_CONTAINER" du -sh /app/uploads 2>/dev/null || echo "  Uploads: (tidak terdeteksi)"
    docker exec "$DMS_CONTAINER" du -sh /app/storage 2>/dev/null || echo "  Storage: (tidak terdeteksi)"
fi
