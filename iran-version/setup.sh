#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# NIBRC Iran Mirror — Quick Setup
# Usage: bash setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════════════╗"
echo "║        NIBRC Iran Mirror — Setup                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Backend ─────────────────────────────────────────────────────────────────
echo "📦 Installing backend..."
cd backend

python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q

mkdir -p data

if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
DATABASE_URL=sqlite:///./data/genova.db
MAIN_SITE_URL=https://nibrc.ir
SYNC_API_KEY=changeme-sync-secret-key
SYNC_INTERVAL=1800
JWT_SECRET=change-me-to-random-string
HOST=0.0.0.0
PORT=8000
ENVEOF
    echo "  ✅ Created .env"
fi

cd ..

# ── Frontend ────────────────────────────────────────────────────────────────
if command -v node &> /dev/null; then
    echo "🎨 Installing frontend..."
    cd frontend
    npm install --silent
    npm run build
    cd ..
    echo "  ✅ Frontend ready"
else
    echo "⚠️  Node.js not found — frontend build skipped"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Setup Complete!                              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  To start: bash start.sh                             ║"
echo "║                                                      ║"
echo "║  Or manually:                                        ║"
echo "║    cd backend                                        ║"
echo "║    source venv/bin/activate                          ║"
echo "║    python -m uvicorn app.main:app --port 8000       ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
