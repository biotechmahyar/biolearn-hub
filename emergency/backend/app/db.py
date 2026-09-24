"""Minimal SQLite access used by the emergency service scaffold.

The schema and import pipeline will be added in phase two. This module only
opens the configured local database and provides a readiness check.
"""
from pathlib import Path
import sqlite3

from .config import settings


def connect() -> sqlite3.Connection:
    database_path = Path(settings.database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    return connection


def database_is_ready() -> bool:
    try:
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
