"""
Iran Mirror Site — FastAPI Backend
Read-only mirror of the main NIBRC site, synced every 30 minutes.
When the main site is unreachable, the Iran site continues serving
cached data and queues offline changes for later sync.
"""

import os
import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db, SessionLocal
from app.routes.content import router as content_router
from app.routes.sync import router as sync_router
from app.routes.auth import router as auth_router
from app.routes.offline import router as offline_router
from app.services.sync_service import run_full_sync

SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "1800"))  # 30 minutes default


def _background_sync_loop():
    """Background thread that syncs every SYNC_INTERVAL seconds."""
    while True:
        time.sleep(SYNC_INTERVAL)
        try:
            db = SessionLocal()
            result = run_full_sync(db)
            print(f"[AUTO-SYNC] {result}")
            db.close()
        except Exception as e:
            print(f"[AUTO-SYNC] Error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize database
    init_db()
    print("[STARTUP] Database initialized")

    # Run initial sync
    try:
        db = SessionLocal()
        result = run_full_sync(db)
        print(f"[STARTUP] Initial sync: {result}")
        db.close()
    except Exception as e:
        print(f"[STARTUP] Initial sync failed: {e}")

    # Start background sync loop
    sync_thread = threading.Thread(target=_background_sync_loop, daemon=True)
    sync_thread.start()
    print(f"[STARTUP] Background sync every {SYNC_INTERVAL}s")

    yield
    print("[SHUTDOWN] Bye!")


app = FastAPI(
    title="Genova Iran Mirror",
    description="Read-only mirror of Genova biological sciences platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(content_router)
app.include_router(sync_router)
app.include_router(auth_router)
app.include_router(offline_router)


@app.get("/")
def root():
    return {
        "name": "Genova Iran Mirror",
        "status": "running",
        "description": "Read-only mirror of the main NIBRC site",
    }


@app.get("/health")
def health():
    return {"ok": True}
