#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# NIBRC Iran Mirror — One-Command Start
# Usage: bash start.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

cd "$(dirname "$0")"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "╔══════════════════════════════════════════════════════╗"
echo "║        NIBRC Iran Mirror — Starting...              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Check Python ────────────────────────────────────────────────────────────
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi

# ── Check Node.js (for building frontend) ───────────────────────────────────
NEED_BUILD=false
if [ ! -d "frontend/dist" ]; then
    NEED_BUILD=true
fi

# ── Backend Setup ───────────────────────────────────────────────────────────
echo "📦 Setting up backend..."
cd backend

# Create venv if missing
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  ✅ Created virtual environment"
fi

source venv/bin/activate

# Install deps
pip install -r requirements.txt -q 2>/dev/null
echo "  ✅ Backend dependencies ready"

# Create .env if missing
if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL=sqlite:///./data/genova.db

# ── Main Site Sync ────────────────────────────────────────────────────
MAIN_SITE_URL=https://nibrc.ir
SYNC_API_KEY=changeme-sync-secret-key
SYNC_INTERVAL=1800

# ── Auth ──────────────────────────────────────────────────────────────
JWT_SECRET=change-me-to-random-string

# ── Server ────────────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=8000
ENVEOF
    echo "  ✅ Created .env (edit with your values!)"
fi

# Ensure data directory
mkdir -p data
echo "  ✅ Backend ready"

# ── Frontend Build ──────────────────────────────────────────────────────────
cd ../frontend

if [ "$NEED_BUILD" = true ]; then
    if command -v node &> /dev/null; then
        echo ""
        echo "🎨 Building frontend..."
        npm install --silent 2>/dev/null
        npm run build
        echo "  ✅ Frontend built"
    else
        echo ""
        echo "⚠️  Node.js not found — skipping frontend build"
        echo "   Frontend will be served from backend root endpoint only"
    fi
else
    echo "  ✅ Frontend already built"
fi

cd ../backend

# ── Start Server ────────────────────────────────────────────────────────────
echo ""
echo "🚀 Starting server on http://${HOST}:${PORT}"
echo "   Frontend: http://${HOST}:${PORT}"
echo "   API:      http://${HOST}:${PORT}/api"
echo "   Health:   http://${HOST}:${PORT}/health"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

exec python -m uvicorn app.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --log-level info
