"""Environment configuration for the emergency service."""
from dataclasses import dataclass
import os


def _csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("EMERGENCY_APP_NAME", "Genova Emergency Service")
    environment: str = os.getenv("EMERGENCY_ENV", "development")
    host: str = os.getenv("EMERGENCY_HOST", "127.0.0.1")
    port: int = int(os.getenv("EMERGENCY_PORT", "8000"))
    database_path: str = os.getenv(
        "EMERGENCY_DATABASE_PATH",
        "./data/emergency.sqlite3",
    )
    cors_origins: list[str] = _csv(
        os.getenv("EMERGENCY_CORS_ORIGINS"),
        ["http://localhost:5173", "http://127.0.0.1:5173"],
    )


settings = Settings()
