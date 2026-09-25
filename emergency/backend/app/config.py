"""Environment configuration for the emergency service."""
from dataclasses import dataclass, field
import os
import time


def _csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


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
    artifact_root: str = os.getenv(
        "EMERGENCY_ARTIFACT_ROOT",
        "./data/snapshots",
    )
    backup_root: str = os.getenv(
        "EMERGENCY_BACKUP_ROOT",
        "./data/backups",
    )
    file_root: str = os.getenv(
        "EMERGENCY_FILE_ROOT",
        "./data/files",
    )
    max_file_bytes: int = field(
        default_factory=lambda: _int_env("EMERGENCY_MAX_FILE_BYTES", 100 * 1024 * 1024)
    )
    trusted_hosts: list[str] = field(
        default_factory=lambda: _csv(
            os.getenv("EMERGENCY_TRUSTED_HOSTS"),
            ["localhost", "127.0.0.1", "testserver"],
        )
    )
    max_request_body_bytes: int = field(
        default_factory=lambda: _int_env("EMERGENCY_MAX_REQUEST_BODY_BYTES", 2 * 1024 * 1024)
    )
    docs_enabled: bool = os.getenv("EMERGENCY_DOCS_ENABLED", "true").lower() in {"1", "true", "yes"}
    request_telemetry_enabled: bool = os.getenv(
        "EMERGENCY_REQUEST_TELEMETRY_ENABLED", "true"
    ).lower() in {"1", "true", "yes"}
    telemetry_retention_days: int = field(
        default_factory=lambda: _int_env("EMERGENCY_TELEMETRY_RETENTION_DAYS", 30)
    )
    artifact_retention_days: int = field(
        default_factory=lambda: _int_env("EMERGENCY_ARTIFACT_RETENTION_DAYS", 30)
    )
    artifact_retention_keep: int = field(
        default_factory=lambda: _int_env("EMERGENCY_ARTIFACT_RETENTION_KEEP", 14)
    )
    backup_retention_days: int = field(
        default_factory=lambda: _int_env("EMERGENCY_BACKUP_RETENTION_DAYS", 30)
    )
    auth_rate_limit_attempts: int = field(
        default_factory=lambda: _int_env("EMERGENCY_AUTH_RATE_LIMIT_ATTEMPTS", 5)
    )
    auth_rate_limit_window_seconds: int = field(
        default_factory=lambda: _int_env("EMERGENCY_AUTH_RATE_LIMIT_WINDOW_SECONDS", 300)
    )
    auth_rate_limit_block_seconds: int = field(
        default_factory=lambda: _int_env("EMERGENCY_AUTH_RATE_LIMIT_BLOCK_SECONDS", 900)
    )
    service_start_time: float = field(default_factory=time.time)
    cors_origins: list[str] = field(
        default_factory=lambda: _csv(
            os.getenv("EMERGENCY_CORS_ORIGINS"),
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        )
    )


settings = Settings()
