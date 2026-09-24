"""User directory, profile, and role services for the emergency backend.

The service is intentionally independent from the main Genova/Convex runtime.
Records are keyed by their stable source IDs so snapshot imports can be replayed
without creating duplicate users, profiles, roles, or assignments.
"""
from __future__ import annotations

import json
import time
from typing import Any

from .db import connect


class DirectoryError(Exception):
    """Base error for expected directory failures."""


class DirectoryNotFound(DirectoryError):
    pass


class DirectoryPermissionDenied(DirectoryError):
    pass


def _now() -> int:
    return int(time.time())


def _json_dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _json_load(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


class UserDirectoryService:
    """Persistence and authorization rules for phase-four identity data."""

    admin_roles = frozenset({"admin", "superadmin", "super_admin", "owner"})

    def upsert_profile(
        self,
        *,
        user_id: str,
        display_name: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        bio: str | None = None,
        avatar_url: str | None = None,
        resume_url: str | None = None,
        university: str | None = None,
        field_of_study: str | None = None,
        graduation_year: int | None = None,
        skills: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        telegram_id: str | None = None,
        bale_id: str | None = None,
        created_at: int | None = None,
    ) -> None:
        now = _now()
        initial = created_at or now
        with connect() as connection:
            if connection.execute("SELECT 1 FROM emergency_users WHERE id = ?", (user_id,)).fetchone() is None:
                raise DirectoryNotFound("user_not_found")
            connection.execute(
                """
                INSERT INTO emergency_profiles
                    (user_id, display_name, first_name, last_name, phone, bio,
                     avatar_url, resume_url, university, field_of_study,
                     graduation_year, skills_json, metadata_json, telegram_id,
                     bale_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    display_name=excluded.display_name,
                    first_name=excluded.first_name,
                    last_name=excluded.last_name,
                    phone=excluded.phone,
                    bio=excluded.bio,
                    avatar_url=excluded.avatar_url,
                    resume_url=excluded.resume_url,
                    university=excluded.university,
                    field_of_study=excluded.field_of_study,
                    graduation_year=excluded.graduation_year,
                    skills_json=excluded.skills_json,
                    metadata_json=excluded.metadata_json,
                    telegram_id=excluded.telegram_id,
                    bale_id=excluded.bale_id,
                    updated_at=excluded.updated_at
                """,
                (
                    user_id,
                    display_name,
                    first_name,
                    last_name,
                    phone,
                    bio,
                    avatar_url,
                    resume_url,
                    university,
                    field_of_study,
                    graduation_year,
                    _json_dump(skills or []),
                    _json_dump(metadata or {}),
                    telegram_id,
                    bale_id,
                    initial,
                    now,
                ),
            )

    def get_profile(self, user_id: str) -> dict[str, Any] | None:
        with connect() as connection:
            row = connection.execute(
                "SELECT * FROM emergency_profiles WHERE user_id = ?",
                (user_id,),
            ).fetchone()
        return self._profile_row(row) if row is not None else None

    def update_own_profile(self, user_id: str, values: dict[str, Any]) -> dict[str, Any]:
        existing = self.get_profile(user_id)
        merged: dict[str, Any] = {}
        if existing is not None:
            merged = {
                "display_name": existing["displayName"],
                "first_name": existing["firstName"],
                "last_name": existing["lastName"],
                "phone": existing["phone"],
                "bio": existing["bio"],
                "avatar_url": existing["avatarUrl"],
                "resume_url": existing["resumeUrl"],
                "university": existing["university"],
                "field_of_study": existing["fieldOfStudy"],
                "graduation_year": existing["graduationYear"],
                "skills": existing["skills"],
                "metadata": existing["metadata"],
                "telegram_id": existing["telegramId"],
                "bale_id": existing["baleId"],
            }
        merged.update({key: value for key, value in values.items() if key != "userId"})
        self.upsert_profile(user_id=user_id, **merged)
        profile = self.get_profile(user_id)
        if profile is None:
            raise DirectoryNotFound("profile_not_found")
        return profile

    def upsert_role(
        self,
        *,
        role_id: str,
        name: str,
        description: str | None = None,
        permissions: list[str] | None = None,
        panel_access: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_roles
                    (id, name, description, permissions_json, panel_access_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    description=excluded.description,
                    permissions_json=excluded.permissions_json,
                    panel_access_json=excluded.panel_access_json,
                    updated_at=excluded.updated_at
                """,
                (role_id, name.strip(), description, _json_dump(permissions or []), _json_dump(panel_access or {}), now, now),
            )

    def assign_role(self, *, assignment_id: str, user_id: str, role_id: str) -> None:
        with connect() as connection:
            user = connection.execute("SELECT 1 FROM emergency_users WHERE id = ?", (user_id,)).fetchone()
            role = connection.execute("SELECT 1 FROM emergency_roles WHERE id = ?", (role_id,)).fetchone()
            if user is None:
                raise DirectoryNotFound("user_not_found")
            if role is None:
                raise DirectoryNotFound("role_not_found")
            connection.execute(
                """
                INSERT INTO emergency_user_roles (id, user_id, role_id, assigned_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, role_id=excluded.role_id
                """,
                (assignment_id, user_id, role_id, _now()),
            )
            role_name = connection.execute("SELECT name FROM emergency_roles WHERE id = ?", (role_id,)).fetchone()
            if role_name is not None and user_id:
                connection.execute("UPDATE emergency_users SET role = ?, updated_at = ? WHERE id = ?", (role_name["name"], _now(), user_id))

    def remove_role(self, *, user_id: str, role_id: str) -> None:
        with connect() as connection:
            connection.execute("DELETE FROM emergency_user_roles WHERE user_id = ? AND role_id = ?", (user_id, role_id))
            remaining = connection.execute(
                """
                SELECT r.name FROM emergency_user_roles ur
                JOIN emergency_roles r ON r.id = ur.role_id
                WHERE ur.user_id = ? ORDER BY r.name LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            connection.execute(
                "UPDATE emergency_users SET role = ?, updated_at = ? WHERE id = ?",
                (remaining["name"] if remaining is not None else "user", _now(), user_id),
            )

    def get_user_roles(self, user_id: str) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute(
                """
                SELECT r.id, r.name, r.description, r.permissions_json, r.panel_access_json,
                       ur.id AS assignment_id, ur.assigned_at
                FROM emergency_user_roles ur
                JOIN emergency_roles r ON r.id = ur.role_id
                WHERE ur.user_id = ?
                ORDER BY r.name
                """,
                (user_id,),
            ).fetchall()
        return [self._role_row(row) for row in rows]

    def list_roles(self) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute("SELECT * FROM emergency_roles ORDER BY name").fetchall()
        return [self._role_row(row) for row in rows]

    def list_users(self, *, search: str | None = None, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        bounded_limit = min(max(limit, 1), 200)
        bounded_offset = max(offset, 0)
        with connect() as connection:
            if search and search.strip():
                pattern = f"%{search.strip().lower()}%"
                rows = connection.execute(
                    """
                    SELECT id, username, email, role, status, created_at, updated_at
                    FROM emergency_users
                    WHERE lower(username) LIKE ? OR lower(email) LIKE ?
                    ORDER BY created_at, id LIMIT ? OFFSET ?
                    """,
                    (pattern, pattern, bounded_limit, bounded_offset),
                ).fetchall()
            else:
                rows = connection.execute(
                    """
                    SELECT id, username, email, role, status, created_at, updated_at
                    FROM emergency_users ORDER BY created_at, id LIMIT ? OFFSET ?
                    """,
                    (bounded_limit, bounded_offset),
                ).fetchall()
        return [self._user_row(row) for row in rows]

    def get_user(self, user_id: str) -> dict[str, Any]:
        with connect() as connection:
            row = connection.execute(
                "SELECT id, username, email, role, status, created_at, updated_at FROM emergency_users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            raise DirectoryNotFound("user_not_found")
        return self._user_row(row)

    def require_admin(self, user: Any) -> None:
        if str(getattr(user, "role", "")).lower() not in self.admin_roles:
            raise DirectoryPermissionDenied("admin_required")

    def _profile_row(self, row: Any) -> dict[str, Any]:
        return {
            "userId": row["user_id"],
            "displayName": row["display_name"],
            "firstName": row["first_name"],
            "lastName": row["last_name"],
            "phone": row["phone"],
            "bio": row["bio"],
            "avatarUrl": row["avatar_url"],
            "resumeUrl": row["resume_url"],
            "university": row["university"],
            "fieldOfStudy": row["field_of_study"],
            "graduationYear": row["graduation_year"],
            "skills": _json_load(row["skills_json"], []),
            "metadata": _json_load(row["metadata_json"], {}),
            "telegramId": row["telegram_id"],
            "baleId": row["bale_id"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    def _role_row(self, row: Any) -> dict[str, Any]:
        result = {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "permissions": _json_load(row["permissions_json"], []),
            "panelAccess": _json_load(row["panel_access_json"], {}),
        }
        if "assignment_id" in row.keys():
            result["assignmentId"] = row["assignment_id"]
            result["assignedAt"] = row["assigned_at"]
        return result

    @staticmethod
    def _user_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "role": row["role"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
