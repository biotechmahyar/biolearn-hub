"""Local first-admin bootstrap for a fresh emergency database.

This is intentionally a local CLI operation, not a public API. It creates no
default password and refuses to overwrite an existing account unless the
operator explicitly requests rotation.
"""
from __future__ import annotations

import base64
import hashlib
import json
import secrets
import time
from typing import Any

from .auth_service import AuthService
from .db import connect
from .directory_service import UserDirectoryService


class BootstrapError(Exception):
    pass


def _password_hash(password: str, *, iterations: int = 600_000) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("ascii"), iterations
    ).hex()
    return f"pbkdf2_sha256${iterations}${salt}${derived}", "pbkdf2_sha256"


def validate_password(password: str) -> None:
    if len(password) < 12:
        raise BootstrapError("password_must_have_at_least_12_characters")
    if password.lower() in {"password", "genova", "emergency", "admin123"}:
        raise BootstrapError("password_is_too_common")


def bootstrap_admin(
    *,
    username: str,
    email: str,
    password: str,
    rotate_existing: bool = False,
) -> dict[str, Any]:
    username = username.strip()
    email = email.strip().lower()
    if not username or "@" not in email:
        raise BootstrapError("valid_username_and_email_required")
    validate_password(password)

    auth = AuthService()
    directory = UserDirectoryService()
    with connect() as connection:
        existing = connection.execute(
            "SELECT id FROM emergency_users WHERE id = ? OR username = ? OR email = ?",
            (email, username, email),
        ).fetchone()
    user_id = str(existing["id"]) if existing is not None else f"emergency-admin-{secrets.token_hex(8)}"
    if existing is not None and not rotate_existing:
        raise BootstrapError("admin_identity_exists_use_rotate_existing")

    password_hash, algorithm = _password_hash(password)
    auth.upsert_user(
        user_id=user_id,
        username=username,
        email=email,
        role="admin",
        status="active",
    )
    auth.upsert_password_account(
        account_id=f"password:{user_id}",
        user_id=user_id,
        identifier=email,
        password_hash=password_hash,
        password_algorithm=algorithm,
    )
    directory.upsert_role(
        role_id="role-emergency-admin",
        name="admin",
        description="Emergency administrator",
        permissions=["*"],
        panel_access={"admin": True, "snapshot": True, "dataCompletion": True},
    )
    directory.assign_role(
        assignment_id=f"assignment:{user_id}:role-emergency-admin",
        user_id=user_id,
        role_id="role-emergency-admin",
    )
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO emergency_audit_events
                (id, actor_id, action, resource_type, resource_id, occurred_at, metadata_json)
            VALUES (?, 'bootstrap-cli', 'admin.bootstrapped', 'user', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at
            """,
            (
                f"audit-bootstrap:{user_id}",
                user_id,
                int(time.time()),
                json.dumps({"rotateExisting": rotate_existing}, separators=(",", ":")),
            ),
        )
    return {
        "userId": user_id,
        "username": username,
        "email": email,
        "role": "admin",
        "passwordAlgorithm": algorithm,
        "rotated": bool(existing is not None),
    }
