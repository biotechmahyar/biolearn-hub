"""Operational snapshot artifacts for the independent emergency service.

Artifacts are directories containing ``manifest.json`` and ``data.json``.  The
pipeline is deliberately local-only: it reads and writes the emergency SQLite
database and never imports the main Vite/Convex application at runtime.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
from typing import Any, Mapping

from .completion_tables import COMPLETION_SECTION_SPECS
from .config import settings
from .db import connect
from .operations_service import BackupService
from .snapshot_contract import (
    SNAPSHOT_CONTRACT_VERSION,
    SNAPSHOT_SECTIONS,
    SnapshotManifest,
    build_manifest,
    validate_manifest,
)


MANIFEST_FILENAME = "manifest.json"
DATA_FILENAME = "data.json"
MAX_ARTIFACT_BYTES = 100 * 1024 * 1024
_ARTIFACT_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SECRET_KEY_PARTS = ("secret", "token", "password", "private", "api_key", "apikey")


@dataclass(frozen=True)
class TableSpec:
    table: str
    primary_key: str
    json_columns: frozenset[str] = frozenset()
    boolean_columns: frozenset[str] = frozenset()


_TABLE_LISTS: dict[str, tuple[TableSpec, ...]] = {
    "identity": (TableSpec("emergency_users", "id"),),
    "auth_accounts": (TableSpec("emergency_auth_accounts", "id"),),
    "auth_sessions": (TableSpec("emergency_auth_sessions", "id"),),
    "auth_tokens": (
        TableSpec(
            "emergency_auth_tokens",
            "id",
            frozenset({"metadata_json"}),
        ),
    ),
    "auth_secrets": (TableSpec("emergency_auth_keys", "name"),),
    "roles": (
        TableSpec(
            "emergency_roles",
            "id",
            frozenset({"permissions_json", "panel_access_json"}),
        ),
        TableSpec("emergency_user_roles", "id"),
    ),
    "profiles": (
        TableSpec(
            "emergency_profiles",
            "user_id",
            frozenset({"skills_json", "metadata_json"}),
        ),
    ),
    "content": (
        TableSpec(
            "emergency_content_categories",
            "id",
            frozenset({"metadata_json"}),
        ),
        TableSpec("emergency_courses", "id", frozenset({"metadata_json"})),
        TableSpec("emergency_course_sections", "id", frozenset({"metadata_json"})),
        TableSpec(
            "emergency_lessons",
            "id",
            frozenset({"metadata_json"}),
            frozenset({"is_preview"}),
        ),
    ),
    "learning": (
        TableSpec("emergency_enrollments", "id", frozenset({"metadata_json"})),
        TableSpec("emergency_lesson_progress", "id"),
        TableSpec("emergency_study_plans", "id", frozenset({"metadata_json"})),
        TableSpec("emergency_learning_events", "id", frozenset({"payload_json"})),
    ),
    "assessments": (
        TableSpec("emergency_assessments", "id", frozenset({"metadata_json"})),
        TableSpec(
            "emergency_assessment_questions",
            "id",
            frozenset({"metadata_json"}),
        ),
        TableSpec("emergency_assessment_options", "id", boolean_columns=frozenset({"is_correct"})),
        TableSpec("emergency_assessment_attempts", "id", frozenset({"metadata_json"})),
        TableSpec("emergency_assessment_responses", "id", boolean_columns=frozenset({"is_correct"})),
    ),
    "platform_settings": (
        TableSpec(
            "emergency_runtime_settings",
            "key",
            frozenset({"value_json"}),
            frozenset({"is_secret"}),
        ),
    ),
    "bots": (
        TableSpec("emergency_bots", "id", frozenset({"config_json"})),
        TableSpec("emergency_bot_commands", "id", frozenset({"payload_json"}), frozenset({"enabled"})),
        TableSpec("emergency_bot_user_links", "id", frozenset({"metadata_json"})),
    ),
    "payments": (
        TableSpec("emergency_payment_gateways", "id", frozenset({"config_json"})),
        TableSpec("emergency_payment_transactions", "id", frozenset({"metadata_json"})),
        TableSpec("emergency_payment_status_history", "id", frozenset({"metadata_json"})),
    ),
    "commerce": COMPLETION_SECTION_SPECS["commerce"],
    "communication": COMPLETION_SECTION_SPECS["communication"],
    "files": COMPLETION_SECTION_SPECS["files"],
    "audit": (TableSpec("emergency_audit_events", "id", frozenset({"metadata_json"})),),
}

_SECTION_TABLES: dict[str, tuple[TableSpec, ...]] = {
    "identity": _TABLE_LISTS["identity"],
    "auth_accounts": _TABLE_LISTS["auth_accounts"],
    "auth_sessions": _TABLE_LISTS["auth_sessions"],
    "auth_tokens": _TABLE_LISTS["auth_tokens"],
    "auth_secrets": _TABLE_LISTS["auth_secrets"],
    "roles": _TABLE_LISTS["roles"],
    "profiles": _TABLE_LISTS["profiles"],
    "content": _TABLE_LISTS["content"],
    "learning": _TABLE_LISTS["learning"],
    "assessments": _TABLE_LISTS["assessments"],
    "platform_settings": _TABLE_LISTS["platform_settings"],
    "bots": _TABLE_LISTS["bots"],
    "payments": _TABLE_LISTS["payments"],
    "commerce": _TABLE_LISTS["commerce"],
    "communication": _TABLE_LISTS["communication"],
    "files": _TABLE_LISTS["files"],
    "audit": _TABLE_LISTS["audit"],
}

_RELATIONSHIPS: tuple[tuple[str, str, str, str], ...] = (
    ("emergency_auth_accounts", "user_id", "emergency_users", "id"),
    ("emergency_auth_sessions", "user_id", "emergency_users", "id"),
    ("emergency_auth_tokens", "user_id", "emergency_users", "id"),
    ("emergency_auth_tokens", "session_id", "emergency_auth_sessions", "id"),
    ("emergency_profiles", "user_id", "emergency_users", "id"),
    ("emergency_user_roles", "user_id", "emergency_users", "id"),
    ("emergency_user_roles", "role_id", "emergency_roles", "id"),
    ("emergency_courses", "category_id", "emergency_content_categories", "id"),
    ("emergency_course_sections", "course_id", "emergency_courses", "id"),
    ("emergency_lessons", "section_id", "emergency_course_sections", "id"),
    ("emergency_enrollments", "user_id", "emergency_users", "id"),
    ("emergency_enrollments", "course_id", "emergency_courses", "id"),
    ("emergency_lesson_progress", "user_id", "emergency_users", "id"),
    ("emergency_lesson_progress", "lesson_id", "emergency_lessons", "id"),
    ("emergency_lesson_progress", "enrollment_id", "emergency_enrollments", "id"),
    ("emergency_study_plans", "user_id", "emergency_users", "id"),
    ("emergency_learning_events", "user_id", "emergency_users", "id"),
    ("emergency_learning_events", "course_id", "emergency_courses", "id"),
    ("emergency_learning_events", "lesson_id", "emergency_lessons", "id"),
    ("emergency_assessments", "course_id", "emergency_courses", "id"),
    ("emergency_assessment_questions", "assessment_id", "emergency_assessments", "id"),
    ("emergency_assessment_options", "question_id", "emergency_assessment_questions", "id"),
    ("emergency_assessment_attempts", "assessment_id", "emergency_assessments", "id"),
    ("emergency_assessment_attempts", "user_id", "emergency_users", "id"),
    ("emergency_assessment_responses", "attempt_id", "emergency_assessment_attempts", "id"),
    ("emergency_assessment_responses", "question_id", "emergency_assessment_questions", "id"),
    ("emergency_assessment_responses", "option_id", "emergency_assessment_options", "id"),
    ("emergency_bot_commands", "bot_id", "emergency_bots", "id"),
    ("emergency_bot_user_links", "bot_id", "emergency_bots", "id"),
    ("emergency_bot_user_links", "user_id", "emergency_users", "id"),
    ("emergency_payment_transactions", "gateway_id", "emergency_payment_gateways", "id"),
    ("emergency_payment_transactions", "user_id", "emergency_users", "id"),
    ("emergency_payment_status_history", "transaction_id", "emergency_payment_transactions", "id"),
    ("emergency_commerce_products", "seller_id", "emergency_users", "id"),
    ("emergency_commerce_orders", "user_id", "emergency_users", "id"),
    ("emergency_commerce_marketplace_orders", "buyer_id", "emergency_users", "id"),
    ("emergency_commerce_marketplace_orders", "seller_id", "emergency_users", "id"),
    ("emergency_commerce_marketplace_orders", "product_id", "emergency_commerce_products", "id"),
    ("emergency_commerce_reviews", "product_id", "emergency_commerce_products", "id"),
    ("emergency_commerce_reviews", "user_id", "emergency_users", "id"),
    ("emergency_commerce_wallets", "user_id", "emergency_users", "id"),
    ("emergency_commerce_wallet_transactions", "user_id", "emergency_users", "id"),
    ("emergency_commerce_payment_records", "user_id", "emergency_users", "id"),
    ("emergency_commerce_subscriptions", "user_id", "emergency_users", "id"),
    ("emergency_communication_notifications", "user_id", "emergency_users", "id"),
    ("emergency_communication_announcements", "author_id", "emergency_users", "id"),
    ("emergency_communication_inbox_messages", "user_id", "emergency_users", "id"),
    ("emergency_communication_support_tickets", "student_id", "emergency_users", "id"),
    ("emergency_communication_support_tickets", "teacher_id", "emergency_users", "id"),
    ("emergency_communication_support_tickets", "course_id", "emergency_courses", "id"),
    ("emergency_communication_support_messages", "ticket_id", "emergency_communication_support_tickets", "id"),
    ("emergency_communication_support_messages", "sender_id", "emergency_users", "id"),
    ("emergency_communication_direct_messages", "sender_id", "emergency_users", "id"),
    ("emergency_communication_direct_messages", "receiver_id", "emergency_users", "id"),
    ("emergency_communication_mentor_groups", "mentor_id", "emergency_users", "id"),
    ("emergency_communication_mentor_group_members", "group_id", "emergency_communication_mentor_groups", "id"),
    ("emergency_communication_mentor_group_members", "user_id", "emergency_users", "id"),
    ("emergency_communication_mentor_questions", "student_id", "emergency_users", "id"),
    ("emergency_communication_mentor_sessions", "mentor_id", "emergency_users", "id"),
    ("emergency_communication_mentor_sessions", "student_id", "emergency_users", "id"),
    ("emergency_communication_comments", "user_id", "emergency_users", "id"),
)


class SnapshotError(Exception):
    """Base class for operational snapshot failures."""


class SnapshotValidationError(SnapshotError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors) or "snapshot_validation_failed")


class SnapshotImportError(SnapshotError):
    pass


def _dump(value: Any, *, pretty: bool = False) -> bytes:
    options: dict[str, Any] = {"ensure_ascii": False, "sort_keys": True}
    if pretty:
        options["indent"] = 2
    else:
        options["separators"] = (",", ":")
    return (json.dumps(value, **options) + "\n").encode("utf-8")


def _contains_secret(value: Any) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            lowered = str(key).lower()
            if any(part in lowered for part in _SECRET_KEY_PARTS):
                return True
            if _contains_secret(item):
                return True
    elif isinstance(value, list):
        return any(_contains_secret(item) for item in value)
    return False


def _decode_record(row: Any, spec: TableSpec) -> dict[str, Any]:
    record = dict(row)
    for column in spec.json_columns:
        raw = record.get(column)
        try:
            record[column.removesuffix("_json")] = json.loads(raw) if raw else None
        except (TypeError, ValueError, json.JSONDecodeError):
            record[column.removesuffix("_json")] = None
        record.pop(column, None)
    for column in spec.boolean_columns:
        if column in record:
            record[column] = bool(record[column])
    return record


def _encode_record(record: Mapping[str, Any], spec: TableSpec) -> dict[str, Any]:
    encoded = dict(record)
    for column in spec.json_columns:
        value_key = column.removesuffix("_json")
        if value_key in encoded:
            encoded[column] = _dump(encoded.pop(value_key), pretty=False).decode("utf-8")
    for column in spec.boolean_columns:
        if column in encoded:
            encoded[column] = int(bool(encoded[column]))
    return encoded


def _table_columns(connection: Any, table: str) -> list[str]:
    return [str(row["name"]) for row in connection.execute(f"PRAGMA table_info({table})")]


def _section_count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return sum(_section_count(item) for item in value.values())
    return 1 if value is not None else 0


def _parse_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


class SnapshotService:
    """Create, inspect, and safely replay local emergency snapshots."""

    def __init__(
        self,
        artifact_root: str | Path | None = None,
        *,
        backup_root: str | Path | None = None,
    ) -> None:
        self.artifact_root = Path(artifact_root or settings.artifact_root).resolve()
        selected_backup_root = (
            backup_root
            if backup_root is not None
            else (Path(artifact_root).parent / "backups" if artifact_root is not None else settings.backup_root)
        )
        self.backup_service = BackupService(selected_backup_root)

    def overview(self) -> dict[str, Any]:
        table_names = sorted({spec.table for specs in _TABLE_LISTS.values() for spec in specs})
        with connect() as connection:
            counts = {
                table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
                for table in table_names
            }
            latest = connection.execute(
                """
                SELECT snapshot_id, contract_version, source, created_at,
                       source_version, imported_at
                FROM emergency_snapshot_imports
                ORDER BY created_at DESC, imported_at DESC LIMIT 1
                """
            ).fetchone()
        return {
            "contractVersion": SNAPSHOT_CONTRACT_VERSION,
            "sections": list(SNAPSHOT_SECTIONS),
            "databaseCounts": counts,
            "artifactRoot": str(self.artifact_root),
            "latestImport": dict(latest) if latest is not None else None,
        }

    def list_artifacts(self) -> list[dict[str, Any]]:
        self.artifact_root.mkdir(parents=True, exist_ok=True)
        artifacts: list[dict[str, Any]] = []
        for candidate in sorted(self.artifact_root.iterdir(), key=lambda item: item.name, reverse=True):
            if not self._is_safe_artifact_name(candidate.name) or candidate.is_symlink() or not candidate.is_dir():
                continue
            try:
                manifest, _ = self._read_artifact(candidate.name)
            except SnapshotError:
                artifacts.append({"name": candidate.name, "valid": False})
                continue
            artifacts.append({
                "name": candidate.name,
                "valid": True,
                "snapshotId": manifest.snapshot_id,
                "createdAt": manifest.created_at,
                "sourceVersion": manifest.source_version,
                "containsSecrets": bool(manifest.compatibility.get("contains_secrets") == "true"),
                "recordCounts": dict(manifest.record_counts),
            })
        return artifacts

    def export(
        self,
        artifact_name: str,
        *,
        include_secrets: bool = False,
        source_version: str = "emergency-0.9.0",
    ) -> dict[str, Any]:
        destination = self._artifact_directory(artifact_name)
        if destination.exists():
            raise SnapshotImportError("artifact_already_exists")

        created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        snapshot_id = f"genova-emergency-{int(time.time())}-{os.urandom(4).hex()}"
        diagnostics: list[dict[str, str]] = []
        sections: dict[str, Any] = {"manifest": {"artifact": MANIFEST_FILENAME}}
        excluded_dependent_sections: set[str] = set()
        for section in SNAPSHOT_SECTIONS:
            if section == "manifest":
                sections[section] = []
                if section != "manifest":
                    diagnostics.append({
                        "severity": "info",
                        "code": "section_not_materialized",
                        "section": section,
                    })
                continue
            specs = _SECTION_TABLES.get(section, ())
            section_value: dict[str, list[dict[str, Any]]] = {spec.table: [] for spec in specs}
            with connect() as connection:
                for spec in specs:
                    columns = _table_columns(connection, spec.table)
                    rows = connection.execute(
                        f"SELECT * FROM {spec.table} ORDER BY {spec.primary_key}"
                    ).fetchall()
                    for row in rows:
                        record = _decode_record(row, spec)
                        if section == "auth_sessions":
                            record["token_value"] = None if not include_secrets else record.get("token_value")
                            record["refresh_token_value"] = (
                                None if not include_secrets else record.get("refresh_token_value")
                            )
                        if section == "auth_tokens":
                            record["token_value"] = None if not include_secrets else record.get("token_value")
                        if section == "files" and not include_secrets:
                            record["storage_id"] = None
                            record["original_ref"] = None
                            record["local_path"] = None
                            record["status"] = "redacted"
                        if section == "auth_secrets" and not include_secrets:
                            diagnostics.append({
                                "severity": "warning",
                                "code": "signing_keys_excluded",
                                "record": str(record.get("name", "")),
                            })
                            continue
                        if section == "platform_settings" and record.get("is_secret") and not include_secrets:
                            diagnostics.append({
                                "severity": "warning",
                                "code": "secret_record_excluded",
                                "record": str(record.get("key", "")),
                            })
                            continue
                        if section in {"bots", "payments"} and not include_secrets:
                            protected_value = record.get("config", record.get("metadata"))
                            if _contains_secret(protected_value):
                                excluded_dependent_sections.add(section)
                                diagnostics.append({
                                    "severity": "warning",
                                    "code": "secret_dependent_section_excluded",
                                    "section": section,
                                    "record": str(record.get("id", "")),
                                })
                                continue
                        section_value[spec.table].append(record)
            if section in excluded_dependent_sections:
                section_value = {spec.table: [] for spec in specs}
            if len(specs) == 1:
                sections[section] = section_value[specs[0].table]
            else:
                sections[section] = section_value

        record_counts = {section: _section_count(sections[section]) for section in SNAPSHOT_SECTIONS}
        manifest = build_manifest(
            snapshot_id=snapshot_id,
            created_at=created_at,
            source="genova-emergency-sqlite",
            source_version=source_version,
            record_counts=record_counts,
        )
        manifest.compatibility["artifact_layout"] = "manifest-and-json"
        manifest.compatibility["contains_secrets"] = "true" if include_secrets else "false"
        manifest.compatibility["secret_policy"] = "raw" if include_secrets else "hashes-and-non-secret-records"
        data = {
            "contract_version": SNAPSHOT_CONTRACT_VERSION,
            "snapshot_id": snapshot_id,
            "sections": sections,
            "diagnostics": diagnostics,
        }
        data_bytes = _dump(data, pretty=True)
        manifest.compatibility["data_sha256"] = hashlib.sha256(data_bytes).hexdigest()
        manifest.compatibility["data_file"] = DATA_FILENAME

        self.artifact_root.mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(prefix=".building-", dir=self.artifact_root))
        try:
            os.chmod(staging, 0o700)
            self._write_private(staging / DATA_FILENAME, data_bytes)
            self._write_private(staging / MANIFEST_FILENAME, _dump(manifest.to_dict(), pretty=True))
            if destination.exists() or destination.is_symlink():
                raise SnapshotImportError("artifact_already_exists")
            os.replace(staging, destination)
        except Exception:
            shutil.rmtree(staging, ignore_errors=True)
            raise
        if not include_secrets:
            for record in self._read_artifact(artifact_name)[0].record_counts.values():
                if record < 0:
                    raise SnapshotValidationError(["negative_record_count"])
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_audit_events
                    (id, actor_id, action, resource_type, resource_id, occurred_at, metadata_json)
                VALUES (?, ?, 'snapshot.exported', 'snapshot', ?, ?, ?)
                """,
                (
                    f"audit-export:{snapshot_id}",
                    "emergency-system",
                    snapshot_id,
                    int(time.time()),
                    _dump({"containsSecrets": include_secrets}, pretty=False).decode("utf-8"),
                ),
            )
        return {
            "name": artifact_name,
            "manifest": manifest.to_dict(),
            "diagnostics": diagnostics,
        }

    def validate(self, artifact_name: str) -> dict[str, Any]:
        try:
            manifest, data = self._read_artifact(artifact_name)
        except SnapshotValidationError as error:
            return {"valid": False, "manifest": None, "diagnostics": error.errors, "warnings": []}
        errors = self._validate_data(manifest, data)
        return {
            "valid": not errors,
            "manifest": manifest.to_dict(),
            "diagnostics": errors,
            "warnings": [item for item in data.get("diagnostics", []) if item.get("severity") == "warning"],
        }

    def import_artifact(
        self,
        artifact_name: str,
        *,
        allow_older_recovery: bool = False,
    ) -> dict[str, Any]:
        manifest, data = self._read_artifact(artifact_name)
        errors = self._validate_data(manifest, data)
        if errors:
            raise SnapshotValidationError(errors)

        now = int(time.time())
        with connect() as connection:
            existing = connection.execute(
                "SELECT imported_at FROM emergency_snapshot_imports WHERE snapshot_id = ?",
                (manifest.snapshot_id,),
            ).fetchone()
            if existing is not None:
                return {
                    "snapshotId": manifest.snapshot_id,
                    "replayed": True,
                    "applied": {},
                    "importedAt": int(existing["imported_at"]),
                    "diagnostics": data.get("diagnostics", []),
                }
            latest = connection.execute(
                "SELECT snapshot_id, created_at FROM emergency_snapshot_imports ORDER BY created_at DESC, imported_at DESC LIMIT 1"
            ).fetchone()
            if latest is not None and _parse_timestamp(manifest.created_at) < _parse_timestamp(str(latest["created_at"])):
                if not allow_older_recovery:
                    raise SnapshotImportError("older_snapshot_requires_explicit_recovery")

            relationship_errors = self._relationship_errors(connection, data)
            if relationship_errors:
                raise SnapshotValidationError(relationship_errors)
            try:
                pre_import_backup = self.backup_service.create(
                    reason=f"pre-import-{manifest.snapshot_id[:32]}"
                )
            except Exception as error:
                raise SnapshotImportError("pre_import_backup_failed") from error

            connection.execute("BEGIN IMMEDIATE")
            applied: dict[str, int] = {}
            try:
                for section in SNAPSHOT_SECTIONS:
                    for spec in _SECTION_TABLES.get(section, ()):
                        records = self._records_for_spec(data, section, spec)
                        applied[spec.table] = self._upsert_records(connection, spec, records)
                connection.execute(
                    """
                    INSERT INTO emergency_snapshot_imports
                        (snapshot_id, contract_version, source, created_at,
                         source_version, imported_at, contains_secrets)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        manifest.snapshot_id,
                        manifest.contract_version,
                        manifest.source,
                        manifest.created_at,
                        manifest.source_version,
                        now,
                        int(manifest.compatibility.get("contains_secrets") == "true"),
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO emergency_audit_events
                        (id, actor_id, action, resource_type, resource_id, occurred_at, metadata_json)
                    VALUES (?, ?, 'snapshot.imported', 'snapshot', ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,
                        metadata_json=excluded.metadata_json
                    """,
                    (
                        f"audit-import:{manifest.snapshot_id}",
                        "emergency-admin",
                        manifest.snapshot_id,
                        now,
                        _dump(
                            {
                                "containsSecrets": manifest.compatibility.get("contains_secrets") == "true",
                                "allowOlderRecovery": allow_older_recovery,
                            },
                            pretty=False,
                        ).decode("utf-8"),
                    ),
                )
                connection.commit()
            except Exception:
                connection.rollback()
                raise
        return {
            "snapshotId": manifest.snapshot_id,
            "replayed": False,
            "applied": applied,
            "importedAt": now,
            "preImportBackup": pre_import_backup,
            "diagnostics": data.get("diagnostics", []),
        }

    def prune_artifacts(
        self,
        *,
        retention_days: int,
        keep: int,
    ) -> dict[str, Any]:
        bounded_days = min(max(int(retention_days), 1), 3650)
        bounded_keep = min(max(int(keep), 0), 10_000)
        cutoff = time.time() - bounded_days * 86400
        if not self.artifact_root.exists():
            return {"removed": [], "remaining": 0}
        candidates: list[tuple[float, Path]] = []
        for path in self.artifact_root.iterdir():
            if not self._is_safe_artifact_name(path.name) or path.is_symlink() or not path.is_dir():
                continue
            candidates.append((path.stat().st_mtime, path))
        candidates.sort(key=lambda item: (item[0], item[1].name), reverse=True)
        removed: list[str] = []
        for index, (modified_at, path) in enumerate(candidates):
            if index >= bounded_keep and modified_at < cutoff:
                shutil.rmtree(path)
                removed.append(path.name)
        return {
            "removed": removed,
            "remaining": len(self.list_artifacts()),
        }

    def _artifact_directory(self, artifact_name: str, *, create: bool = False) -> Path:
        if not self._is_safe_artifact_name(artifact_name):
            raise SnapshotValidationError(["unsafe_artifact_name"])
        root = self.artifact_root.resolve()
        candidate = root / artifact_name
        if candidate.is_symlink() or candidate.parent.resolve() != root:
            raise SnapshotValidationError(["unsafe_artifact_path"])
        if create:
            root.mkdir(mode=0o700, parents=True, exist_ok=True)
            candidate.mkdir(mode=0o700, parents=False, exist_ok=False)
        return candidate

    @staticmethod
    def _is_safe_artifact_name(value: str) -> bool:
        return bool(_ARTIFACT_NAME.fullmatch(value)) and value not in {".", ".."}

    @staticmethod
    def _write_private(path: Path, content: bytes) -> None:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
        except Exception:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
            raise

    @staticmethod
    def _read_limited(path: Path) -> bytes:
        if path.is_symlink() or not path.is_file():
            raise SnapshotValidationError([f"missing_artifact_file:{path.name}"])
        if path.stat().st_size > MAX_ARTIFACT_BYTES:
            raise SnapshotValidationError([f"artifact_file_too_large:{path.name}"])
        return path.read_bytes()

    def _read_artifact(self, artifact_name: str) -> tuple[SnapshotManifest, dict[str, Any]]:
        directory = self._artifact_directory(artifact_name)
        if not directory.is_dir():
            raise SnapshotValidationError(["artifact_not_found"])
        try:
            manifest_value = json.loads(self._read_limited(directory / MANIFEST_FILENAME))
            data_bytes = self._read_limited(directory / DATA_FILENAME)
            data = json.loads(data_bytes)
        except (UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError) as error:
            raise SnapshotValidationError([f"invalid_json:{type(error).__name__}"]) from error
        if not isinstance(manifest_value, dict) or not isinstance(data, dict):
            raise SnapshotValidationError(["artifact_root_must_be_object"])
        try:
            manifest = SnapshotManifest(
                contract_version=int(manifest_value["contract_version"]),
                snapshot_id=str(manifest_value["snapshot_id"]),
                source=str(manifest_value["source"]),
                created_at=str(manifest_value["created_at"]),
                source_version=str(manifest_value["source_version"]),
                sections=tuple(str(item) for item in manifest_value["sections"]),
                record_counts={str(key): int(value) for key, value in dict(manifest_value.get("record_counts", {})).items()},
                compatibility={str(key): str(value) for key, value in dict(manifest_value.get("compatibility", {})).items()},
            )
        except (KeyError, TypeError, ValueError) as error:
            raise SnapshotValidationError([f"invalid_manifest:{type(error).__name__}"]) from error
        errors = validate_manifest(manifest)
        try:
            _parse_timestamp(manifest.created_at)
        except ValueError:
            errors.append("invalid_created_at")
        expected_hash = manifest.compatibility.get("data_sha256")
        actual_hash = hashlib.sha256(data_bytes).hexdigest()
        if not expected_hash:
            errors.append("missing_data_sha256")
        elif expected_hash != actual_hash:
            errors.append("data_checksum_mismatch")
        if manifest.compatibility.get("data_file") != DATA_FILENAME:
            errors.append("unexpected_data_file")
        if errors:
            raise SnapshotValidationError(errors)
        return manifest, data

    def _validate_data(self, manifest: SnapshotManifest, data: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        if data.get("contract_version") != SNAPSHOT_CONTRACT_VERSION:
            errors.append("data_contract_version_mismatch")
        if data.get("snapshot_id") != manifest.snapshot_id:
            errors.append("data_snapshot_id_mismatch")
        sections = data.get("sections")
        if not isinstance(sections, dict):
            return errors + ["invalid_sections"]
        missing = [section for section in SNAPSHOT_SECTIONS if section not in sections]
        if missing:
            errors.append(f"missing_data_sections:{','.join(missing)}")
        unknown = [section for section in sections if section not in SNAPSHOT_SECTIONS]
        if unknown:
            errors.append(f"unknown_data_sections:{','.join(unknown)}")
        for section in SNAPSHOT_SECTIONS:
            if section not in sections:
                continue
            count = _section_count(sections[section])
            if manifest.record_counts.get(section) != count:
                errors.append(f"record_count_mismatch:{section}")
            for spec in _SECTION_TABLES.get(section, ()):
                records = self._records_for_spec(data, section, spec)
                seen: set[Any] = set()
                for index, record in enumerate(records):
                    if not isinstance(record, dict):
                        errors.append(f"invalid_record:{spec.table}:{index}")
                        continue
                    record_id = record.get(spec.primary_key)
                    if not isinstance(record_id, str) or not record_id.strip():
                        errors.append(f"missing_record_id:{spec.table}:{index}")
                    elif record_id in seen:
                        errors.append(f"duplicate_record_id:{spec.table}:{record_id}")
                    else:
                        seen.add(record_id)
        return errors

    @staticmethod
    def _records_for_spec(data: Mapping[str, Any], section: str, spec: TableSpec) -> list[dict[str, Any]]:
        value = data.get("sections", {}).get(section, [])
        if isinstance(value, list):
            records = value
        elif isinstance(value, dict):
            records = value.get(spec.table, [])
        else:
            records = []
        return [record for record in records if isinstance(record, dict)]

    def _relationship_errors(self, connection: Any, data: dict[str, Any]) -> list[str]:
        available: dict[str, set[Any]] = {}
        records_by_table: dict[str, list[dict[str, Any]]] = {}
        for specs in _TABLE_LISTS.values():
            for spec in specs:
                records = [
                    record
                    for section in _SECTION_TABLES
                    for record in self._records_for_spec(data, section, spec)
                ]
                records_by_table[spec.table] = records
                existing = {
                    str(row[0]) for row in connection.execute(f"SELECT {spec.primary_key} FROM {spec.table}")
                }
                available[spec.table] = existing | {
                    record.get(spec.primary_key) for record in records if record.get(spec.primary_key) is not None
                }

        errors: list[str] = []
        for child, child_column, parent, parent_column in _RELATIONSHIPS:
            for index, record in enumerate(records_by_table.get(child, [])):
                parent_id = record.get(child_column)
                if parent_id is not None and parent_id not in available.get(parent, set()):
                    errors.append(
                        f"missing_relationship:{child}[{index}].{child_column}->{parent}:{parent_id}"
                    )
        return errors

    @staticmethod
    def _upsert_records(connection: Any, spec: TableSpec, records: list[dict[str, Any]]) -> int:
        if not records:
            return 0
        columns = _table_columns(connection, spec.table)
        applied = 0
        for raw_record in records:
            encoded = _encode_record(raw_record, spec)
            unknown = set(encoded) - set(columns)
            if unknown:
                raise SnapshotValidationError([f"unknown_columns:{spec.table}:{','.join(sorted(unknown))}"])
            record = {column: encoded.get(column) for column in columns}
            if record.get(spec.primary_key) is None:
                raise SnapshotValidationError([f"missing_primary_key:{spec.table}"])
            names = list(record)
            placeholders = ", ".join("?" for _ in names)
            updates = ", ".join(f"{column}=excluded.{column}" for column in names if column != spec.primary_key)
            sql = (
                f"INSERT INTO {spec.table} ({', '.join(names)}) VALUES ({placeholders}) "
                f"ON CONFLICT({spec.primary_key}) DO UPDATE SET {updates}"
            )
            connection.execute(sql, tuple(record[column] for column in names))
            applied += 1
        return applied
