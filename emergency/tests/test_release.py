from pathlib import Path

import pytest

from app.auth_service import AuthService, InvalidCredentials
from app.bootstrap_service import BootstrapError, bootstrap_admin
from app.operations_service import BackupService


def test_first_admin_bootstrap_and_explicit_rotation() -> None:
    result = bootstrap_admin(
        username="release-admin",
        email="release-admin@example.test",
        password="Release-only-password-73!",
    )
    assert result["role"] == "admin"
    auth = AuthService()
    assert auth.authenticate("release-admin@example.test", "Release-only-password-73!").role == "admin"

    with pytest.raises(BootstrapError, match="admin_identity_exists"):
        bootstrap_admin(
            username="release-admin",
            email="release-admin@example.test",
            password="Another-release-password-73!",
        )

    rotated = bootstrap_admin(
        username="release-admin",
        email="release-admin@example.test",
        password="Rotated-release-password-91!",
        rotate_existing=True,
    )
    assert rotated["rotated"] is True
    with pytest.raises(InvalidCredentials):
        auth.authenticate("release-admin@example.test", "Release-only-password-73!")
    assert auth.authenticate("release-admin@example.test", "Rotated-release-password-91!")


def test_bootstrap_rejects_common_password() -> None:
    with pytest.raises(BootstrapError, match="too_common"):
        bootstrap_admin(
            username="weak-admin",
            email="weak-admin@example.test",
            password="admin123",
        )


def test_backup_verification_rejects_invalid_name(tmp_path: Path) -> None:
    service = BackupService(tmp_path / "backups")
    backup = service.create(reason="release-test")
    assert service.verify(backup["name"])["valid"] is True
    with pytest.raises(ValueError):
        service.verify("../outside.sqlite3")
