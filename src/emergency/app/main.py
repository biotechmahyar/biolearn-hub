"""Emergency NIBRC — FastAPI application (zero external frontend deps).

Runs under /emergency prefix so it can be served at nibrc.ir/emergency
behind the main Convex/React site.
"""
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.auth.router import router as auth_router
from app.routes.public import router as public_router
from app.routes.student import router as student_router
from app.routes.admin import router as admin_router

# Force all models to register with Base.metadata before create_all()
import app.models  # noqa: F401


app = FastAPI(title="NIBRC Emergency", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── /emergency prefix router ────────────────────────────────────────────────
emergency = APIRouter(prefix="/emergency")

# Static files under /emergency/static
emergency.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include all sub-routers under /emergency
emergency.include_router(auth_router)      # /emergency/auth/...
emergency.include_router(public_router)    # /emergency/...
emergency.include_router(student_router)   # /emergency/dashboard/...
emergency.include_router(admin_router)     # /emergency/admin/...

app.include_router(emergency)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "nibrc-emergency"}
