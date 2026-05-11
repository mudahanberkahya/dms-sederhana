#!/usr/bin/env bash
# ============================================================
# DMS Sederhana — On-Premise Setup Script
# Hotel Local Server / Perusahaan
# ============================================================
set -e

# ─── Colors ────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     DMS Sederhana — On-Premise Installer     ║"
echo "║        Document Management System            ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Pre-flight Checks ──────────────────────────────
echo -e "${YELLOW}[1/6] Pre-flight checks...${NC}"

if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Jangan jalankan sebagai root. Gunakan user biasa (dengan sudo).${NC}"
    exit 1
fi

# Check OS
OS="$(uname -s)"
if [ "$OS" != "Linux" ]; then
    echo -e "${RED}Script ini untuk Linux (Ubuntu/Debian recommended).${NC}"
    exit 1
fi

# Check architecture
ARCH="$(uname -m)"
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then
    echo -e "${YELLOW}Warning: Architecture $ARCH belum banyak di-test. Recommended: x86_64.${NC}"
fi

# ─── Install Dependencies ──────────────────────────
echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"

install_packages() {
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq curl git docker.io docker-compose-v2 2>/dev/null || \
        sudo apt-get install -y -qq curl git docker.io docker-compose 2>/dev/null
    elif command -v yum &>/dev/null; then
        sudo yum install -y -q curl git docker docker-compose-plugin
    else
        echo -e "${RED}Package manager tidak dikenal. Install manual: curl, git, docker.${NC}"
        exit 1
    fi
}

install_packages

# Start & enable Docker
sudo systemctl enable --now docker 2>/dev/null || true
sudo usermod -aG docker "$USER" 2>/dev/null || true

echo -e "${GREEN}✓ Docker ready${NC}"

# ─── Get Config from User ───────────────────────────
echo -e "${YELLOW}[3/6] Configuration${NC}"

echo ""
echo -e "${CYAN}--- Storage ---${NC}"
read -p "Storage path untuk dokumen & uploads [default: /opt/dms/storage]: " STORAGE_PATH
STORAGE_PATH="${STORAGE_PATH:-/opt/dms/storage}"

read -p "Path untuk database PostgreSQL (biarkan kosong jika lokal) [default: $STORAGE_PATH/pgdata]: " DB_PATH
DB_PATH="${DB_PATH:-$STORAGE_PATH/pgdata}"

echo ""
echo -e "${CYAN}--- Database ---${NC}"
read -p "Gunakan database lokal? (y/N, default y): " USE_LOCAL_DB
if [[ "$USE_LOCAL_DB" =~ ^[Nn] ]]; then
    read -p "PostgreSQL connection string (postgres://user:pass@host:5432/dbname): " DATABASE_URL
    while [ -z "$DATABASE_URL" ]; do
        read -p "PostgreSQL connection string: " DATABASE_URL
    done
    USE_LOCAL_DB="false"
else
    USE_LOCAL_DB="true"
    echo "  → PostgreSQL akan jalan dalam container lokal"
fi

echo ""
echo -e "${CYAN}--- DeepSeek API ---${NC}"
read -p "DeepSeek API Key (biarkan kosong untuk configure nanti): " DEEPSEEK_KEY

echo ""
echo -e "${CYAN}--- Web Port ---${NC}"
read -p "Port untuk web interface [default: 3001]: " WEB_PORT
WEB_PORT="${WEB_PORT:-3001}"

echo ""
echo -e "${CYAN}--- Domain / Reverse Proxy (opsional) ---${NC}"
read -p "Domain name (biarkan kosong jika akses via IP): " DOMAIN_NAME

# ─── Prepare Directories ──────────────────────────
echo -e "${YELLOW}[4/6] Preparing directories...${NC}"

sudo mkdir -p "$STORAGE_PATH/uploads"
sudo mkdir -p "$STORAGE_PATH/signatures"
sudo mkdir -p "$STORAGE_PATH/templates"
sudo mkdir -p "$DB_PATH" 2>/dev/null || true

# ─── Clone / Pull Repo ────────────────────────────
echo -e "${YELLOW}[5/6] Setting up application...${NC}"

APP_DIR="/opt/dms/app"
if [ -d "$APP_DIR" ]; then
    echo "  → Existing installation found. Pulling updates..."
    cd "$APP_DIR"
    sudo git pull origin main
else
    sudo mkdir -p /opt/dms
    sudo git clone https://github.com/mudahanberkahya/dms-sederhana.git "$APP_DIR"
    cd "$APP_DIR"
fi

# ─── Configure .env ────────────────────────────────
echo "  → Creating .env file..."

sudo tee "$APP_DIR/.env" > /dev/null << EOF
# ============================
# DMS Sederhana — Environment
# ============================

# DeepSeek AI
DEEPSEEK_API_KEY=${DEEPSEEK_KEY:-your-api-key-here}

# Database
USE_LOCAL_DB=${USE_LOCAL_DB}
DATABASE_URL=${DATABASE_URL:-postgres://dms:dms_password@postgres:5432/dms}
POSTGRES_USER=dms
POSTGRES_PASSWORD=dms_password
POSTGRES_DB=dms

# Redis (lokal via container)
REDIS_URL=redis://redis:6379

# Storage Paths
STORAGE_PATH=${STORAGE_PATH}
UPLOAD_PATH=${STORAGE_PATH}/uploads
SIGNATURE_PATH=${STORAGE_PATH}/signatures
TEMPLATE_PATH=${STORAGE_PATH}/templates

# Web
PORT=${WEB_PORT}
NODE_ENV=production

# Domain (optional — untuk CORS & file serving)
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
EOF

# ─── Fix docker-compose.yml ─────────────────────────
echo "  → Configuring docker-compose.yml..."

if [ "$USE_LOCAL_DB" == "true" ]; then
    # Pastikan postgres service ada di compose
    if ! grep -q "postgres:" "$APP_DIR/docker-compose.yml" 2>/dev/null; then
        echo -e "${YELLOW}Warning: docker-compose.yml tidak memiliki service postgres.${NC}"
        echo -e "${YELLOW}Pastikan DATABASE_URL mengarah ke postgres yang bisa diakses.${NC}"
    fi
fi

# ─── Start Application ────────────────────────────
echo -e "${YELLOW}[6/6] Starting application...${NC}"

cd "$APP_DIR"
sudo docker compose down 2>/dev/null || true
sudo docker compose pull 2>/dev/null || true
sudo docker compose up -d --build

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        DMS Sederhana is RUNNING!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Akses:${NC}  http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):${WEB_PORT}"
echo -e "  ${CYAN}Login:${NC}   forest-29%-thunder / password"
echo -e "  ${CYAN}Storage:${NC} ${STORAGE_PATH}"
echo ""
echo -e "${YELLOW}Catatan:${NC}"
echo "  • Login pertama: user: forest-29%-thunder, pass: forest 6+ (atau sesuai admin)"
echo "  • Setup roles, departments, dan workflow di menu Admin setelah login"
echo "  • Kalau akses via NAS, pastikan path NAS sudah di-mount sebelum setup"
echo ""

# Optional: Nginx
if [ -n "$DOMAIN_NAME" ]; then
    echo -e "${CYAN}  Ingin setup reverse proxy Nginx untuk ${DOMAIN_NAME}? (y/N)${NC}"
    read -p "  → " SETUP_NGINX
    if [[ "$SETUP_NGINX" =~ ^[Yy] ]]; then
        sudo tee /etc/nginx/sites-available/dms > /dev/null << NGINX
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }

    location /storage/ {
        alias ${STORAGE_PATH}/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX
        sudo ln -sf /etc/nginx/sites-available/dms /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        echo -e "${GREEN}  ✓ Nginx configured for ${DOMAIN_NAME}${NC}"
    fi
fi

# Fix permissions
sudo chown -R 1000:1000 "$STORAGE_PATH" 2>/dev/null || true

echo -e "${GREEN}Done! 🎉${NC}"
