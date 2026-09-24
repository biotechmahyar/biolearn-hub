"""SQLite access and the phase-three emergency auth schema."""
from pathlib import Path
import sqlite3

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS emergency_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_auth_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'password',
    identifier TEXT NOT NULL,
    password_hash TEXT,
    password_algorithm TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_value TEXT,
    refresh_token_value TEXT,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    refresh_expires_at INTEGER,
    revoked_at INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    token_value TEXT,
    token_hash TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER,
    revoked_at INTEGER,
    session_id TEXT,
    metadata_json TEXT,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(session_id) REFERENCES emergency_auth_sessions(id)
);

CREATE TABLE IF NOT EXISTS emergency_auth_keys (
    name TEXT PRIMARY KEY,
    key_id TEXT NOT NULL,
    value TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    issuer TEXT,
    audience TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions_json TEXT NOT NULL DEFAULT '[]',
    panel_access_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id),
    FOREIGN KEY(role_id) REFERENCES emergency_roles(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS emergency_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    resume_url TEXT,
    university TEXT,
    field_of_study TEXT,
    graduation_year INTEGER,
    skills_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    telegram_id TEXT,
    bale_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES emergency_users(id)
);

CREATE INDEX IF NOT EXISTS emergency_accounts_user_idx
    ON emergency_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS emergency_sessions_token_idx
    ON emergency_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS emergency_sessions_refresh_idx
    ON emergency_auth_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS emergency_tokens_hash_idx
    ON emergency_auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS emergency_roles_name_idx
    ON emergency_roles(name);
CREATE INDEX IF NOT EXISTS emergency_user_roles_user_idx
    ON emergency_user_roles(user_id);
CREATE INDEX IF NOT EXISTS emergency_user_roles_role_idx
    ON emergency_user_roles(role_id);
"""


def connect() -> sqlite3.Connection:
    database_path = Path(settings.database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    # Keep local emergency databases created by earlier phases usable.
    token_columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(emergency_auth_tokens)")
    }
    if "session_id" not in token_columns:
        connection.execute(
            "ALTER TABLE emergency_auth_tokens ADD COLUMN session_id TEXT REFERENCES emergency_auth_sessions(id)"
        )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS emergency_tokens_session_idx ON emergency_auth_tokens(session_id)"
    )
    return connection


def database_is_ready() -> bool:
    try:
        with connect() as connection:
            connection.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
