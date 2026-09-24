import hashlib
import json
from pathlib import Path

import pytest

from app.auth_service import AuthService
from app.db import connect
from app.directory_service import UserDirectoryService
from app.runtime_service import RuntimeService
from app.snapshot_service import (
    DATA_FILENAME,
    MANIFEST_FILENAME,
    SnapshotImportError,
    SnapshotService,
    SnapshotValidationError,
)


def _seed_recovery_data(suffix: str) -> None:
    now = 1_700_000_000
    user_id = f"snapshot-user-{suffix}"
    auth = AuthService()
    auth.upsert_user(
        user_id=user_id,
        username=f"snapshot-{suffix}",
        email=f"snapshot-{suffix}@example.test",
        role="admin",
        created_at=now,
    )
    auth.upsert_password_account(
        account_id=f"snapshot-account-{suffix}",
        user_id=user_id,
        identifier=f"snapshot-{suffix}",
        password_hash=f"pbkdf2_sha256$1$salt$hash-{suffix}",
        password_algorithm="pbkdf2_sha256",
    )
    auth.upsert_session(
        session_id=f"snapshot-session-{suffix}",
        user_id=user_id,
        access_token=f"access-{suffix}",
        refresh_token=f"refresh-{suffix}",
        issued_at=now,
        expires_at=now + 10_000,
        refresh_expires_at=now + 20_000,
    )
    auth.upsert_signing_key(
        name=f"jwt-{suffix}",
        key_id=f"kid-{suffix}",
        value=f"private-{suffix}",
        algorithm="HS256",
    )
    directory = UserDirectoryService()
    directory.upsert_profile(user_id=user_id, display_name="Snapshot Admin")
    directory.upsert_role(
        role_id=f"snapshot-role-{suffix}",
        name=f"snapshot-admin-{suffix}",
        permissions=["snapshot:*"],
    )
    directory.assign_role(
        assignment_id=f"snapshot-assignment-{suffix}",
        user_id=user_id,
        role_id=f"snapshot-role-{suffix}",
    )
    RuntimeService().upsert_runtime_setting(
        key=f"snapshot.secret.{suffix}",
        value=f"runtime-secret-{suffix}",
        is_secret=True,
    )


def _read_data(service: SnapshotService, name: str) -> tuple[dict, dict]:
    directory = service.artifact_root / name
    return (
        json.loads((directory / MANIFEST_FILENAME).read_text(encoding="utf-8")),
        json.loads((directory / DATA_FILENAME).read_text(encoding="utf-8")),
    )


def test_snapshot_validation_detects_tampering(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    _seed_recovery_data("checksum")
    service.export("checksum-artifact")
    data_path = service.artifact_root / "checksum-artifact" / DATA_FILENAME
    data = json.loads(data_path.read_text(encoding="utf-8"))
    data["sections"]["identity"][0]["role"] = "owner"
    data_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    report = service.validate("checksum-artifact")
    assert report["valid"] is False
    assert "data_checksum_mismatch" in report["diagnostics"]


def test_non_secret_export_excludes_recovery_secrets(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    _seed_recovery_data("redacted")
    service.export("safe-artifact", include_secrets=False)
    manifest, data = _read_data(service, "safe-artifact")

    assert manifest["compatibility"]["contains_secrets"] == "false"
    assert data["sections"]["auth_secrets"] == []
    assert data["sections"]["auth_sessions"][0]["token_value"] is None
    assert data["sections"]["auth_tokens"] == []
    assert data["sections"]["platform_settings"] == []
    assert "runtime-secret-redacted" not in json.dumps(data)


def test_full_snapshot_round_trip_preserves_ids_and_replay_is_idempotent(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    suffix = "roundtrip"
    _seed_recovery_data(suffix)
    service.export("recovery-artifact", include_secrets=True)
    assert service.validate("recovery-artifact")["valid"] is True

    first = service.import_artifact("recovery-artifact")
    second = service.import_artifact("recovery-artifact")
    assert first["replayed"] is False
    assert first["applied"]["emergency_users"] == 1
    assert second["replayed"] is True

    with connect() as connection:
        user = connection.execute(
            "SELECT id, username FROM emergency_users WHERE id = ?",
            (f"snapshot-user-{suffix}",),
        ).fetchone()
        session = connection.execute(
            "SELECT token_value FROM emergency_auth_sessions WHERE id = ?",
            (f"snapshot-session-{suffix}",),
        ).fetchone()
        signing_key = connection.execute(
            "SELECT value FROM emergency_auth_keys WHERE name = ?",
            (f"jwt-{suffix}",),
        ).fetchone()
    assert dict(user) == {"id": f"snapshot-user-{suffix}", "username": f"snapshot-{suffix}"}
    assert session["token_value"] == f"access-{suffix}"
    assert signing_key["value"] == f"private-{suffix}"


def test_older_snapshot_requires_explicit_recovery(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    _seed_recovery_data("older")
    old_directory = service.artifact_root / "older-artifact"
    service.export("older-artifact")
    old_manifest, old_data = _read_data(service, "older-artifact")
    old_manifest["created_at"] = "2000-01-01T00:00:00Z"
    (old_directory / MANIFEST_FILENAME).write_text(
        json.dumps(old_manifest, ensure_ascii=False), encoding="utf-8"
    )
    # The manifest is not part of data checksum; data still matches.
    assert old_data["sections"]["identity"]
    service.export("newer-artifact")
    service.import_artifact("newer-artifact")

    with pytest.raises(SnapshotImportError, match="older_snapshot"):
        service.import_artifact("older-artifact")
    allowed = service.import_artifact("older-artifact", allow_older_recovery=True)
    assert allowed["replayed"] is False


def test_missing_relationship_aborts_before_writes(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    suffix = "relationship"
    _seed_recovery_data(suffix)
    service.export("broken-artifact")
    directory = service.artifact_root / "broken-artifact"
    manifest = json.loads((directory / MANIFEST_FILENAME).read_text(encoding="utf-8"))
    data = json.loads((directory / DATA_FILENAME).read_text(encoding="utf-8"))
    data["sections"]["profiles"][0]["user_id"] = "missing-user"
    data_bytes = (json.dumps(data, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
    (directory / DATA_FILENAME).write_bytes(data_bytes)
    manifest["compatibility"]["data_sha256"] = hashlib.sha256(data_bytes).hexdigest()
    (directory / MANIFEST_FILENAME).write_text(
        json.dumps(manifest, ensure_ascii=False), encoding="utf-8"
    )

    with pytest.raises(SnapshotValidationError) as raised:
        service.import_artifact("broken-artifact")
    assert any("missing_relationship" in error for error in raised.value.errors)
    with connect() as connection:
        imported = connection.execute(
            "SELECT 1 FROM emergency_snapshot_imports WHERE snapshot_id = ?",
            (manifest["snapshot_id"],),
        ).fetchone()
    assert imported is None


def test_artifact_names_cannot_escape_root(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path)
    with pytest.raises(SnapshotValidationError) as raised:
        service.export("../outside")
    assert "unsafe_artifact_name" in raised.value.errors
