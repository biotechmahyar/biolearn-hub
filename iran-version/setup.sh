#!/bin/bash
# Iran Mirror Site — Quick Setup Script
# Usage: bash setup.sh

set -e

echo "=== NIBRC Iran Mirror — Setup ==="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Install it first:"
    echo "   Ubuntu/Debian: apt install python3 python3-pip python3-venv"
    echo "   CentOS/RHEL:   yum install python3"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install it first:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "   apt install nodejs"
    exit 1
fi

echo "✅ Python3: $(python3 --version)"
echo "✅ Node.js: $(node --version)"
echo ""

# ── Backend Setup ──────────────────────────────────────────────────────────
echo "=== Setting up backend ==="
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  Created virtual environment"
fi

source venv/bin/activate

# Install dependencies
pip install -r requirements.txt -q
echo "  Installed Python dependencies"

# Create .env if not exists
if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL=sqlite:///./data/genova.db

# ── Main Site Sync ────────────────────────────────────────────────────
MAIN_SITE_URL=https://nibrc.ir
SYNC_API_KEY=your-sync-secret-key-here
SYNC_INTERVAL=1800

# ── JWT Auth ──────────────────────────────────────────────────────────
JWT_SECRET=change-me-to-a-random-secret-key
JWT_ACCESS_EXPIRE_MINUTES=30

# ── Server ────────────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=8000
ENVEOF
    echo "  Created .env — edit it with your values!"
fi

# Create data directory
mkdir -p data
echo "  Backend ready!"
echo ""

# ── Frontend Setup ─────────────────────────────────────────────────────────
echo "=== Setting up frontend ==="
cd ../frontend

# Install dependencies
npm install --silent
echo "  Installed npm dependencies"

# Build
npm run build
echo "  Built frontend → dist/"
echo ""

# ── Summary ────────────────────────────────────────────────────────────────
echo "=== Setup Complete! ==="
echo ""
echo "To start the backend:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "To serve the frontend:"
echo "  Copy frontend/dist/* to your web server root"
echo "  Or use: npx serve frontend/dist -l 3000"
echo ""
echo "Don't forget to edit backend/.env with your values!"
