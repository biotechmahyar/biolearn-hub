"""Emergency NIBRC configuration — no external dependencies."""
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://nibrc:nibrc_secret@localhost:5432/nibrc_emergency",
)
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-emergency-secret")
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
EMERGENCY_PORT = int(os.getenv("EMERGENCY_PORT", "8000"))
