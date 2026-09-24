"""Independent emergency service for Genova.

This service is intentionally separate from the Vite/Convex application. The
first phase only provides a runnable shell, configuration, and a local SQLite
connection; data import and authentication are added in later phases.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .db import database_is_ready

app = FastAPI(
    title="Genova Emergency Service",
    version="0.1.0",
    description="Independent fallback service for Genova.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    service: str
    status: str
    version: str
    database: str


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {
        "service": "genova-emergency",
        "status": "running",
        "message": "Emergency service is running independently.",
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    database_status = "ready" if database_is_ready() else "unavailable"
    overall_status = "ok" if database_status == "ready" else "degraded"
    return HealthResponse(
        service="genova-emergency",
        status=overall_status,
        version="0.1.0",
        database=database_status,
    )
