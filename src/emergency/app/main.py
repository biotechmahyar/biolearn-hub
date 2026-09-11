"""Emergency NIBRC — FastAPI application (zero external frontend deps)."""
from fastapi import FastAPI
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

# Static files (CSS, JS, images) — all local, no CDN
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Routers
app.include_router(auth_router)
app.include_router(public_router)
app.include_router(student_router)
app.include_router(admin_router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "nibrc-emergency"}
