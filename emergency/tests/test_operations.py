import os
from pathlib import Path
from types import SimpleNamespace

from app.config import settings
from app.operations_service import BackupService, TelemetryService
from app.security import LoginRateLimiter
from app.snapshot_service import SnapshotService


def _request(method: str = "GET", path: str = "/api/users/{user_id}") -> SimpleNamespace:
    return SimpleNamespace(
        method=method,
        scope={"route": SimpleNamespace(path=path)},
    )


def test_telemetry_uses_route_templates_and_redacted_error_fingerprints() -> None:
    service = TelemetryService()
    service.record_request(_request(), status_code=200, duration_ms=12.5)
    service.record_request(_request(), status_code=503, duration_ms=20.0)
    service.record_error(
        _request(),
        RuntimeError("must-never-be-stored"),
        request_id="request-test-1",
    )
    summary = service.summary()
    serialized = str(summary)

    assert summary["requestsLastHour"] == 2
    assert all(route["route"] == "/api/users/{user_id}" for route in summary["routes"])
    assert "must-never-be-stored" not in serialized
    assert "request-test-1" in serialized
    assert summary["privacy"] == {
        "rawPaths": False,
        "queryStrings": False,
        "requestBodies": False,
        "authorizationHeaders": False,
        "clientIps": False,
        "exceptionMessages": False,
    }
    metrics = service.prometheus_metrics()
    assert "genova_emergency_up 1" in metrics
    assert "/api/users/{user_id}" in metrics


def test_verified_backup_is_private_and_lists_successfully(tmp_path: Path) -> None:
    service = BackupService(tmp_path / "backups")
    result = service.create(reason="phase-eight-test")

    assert result["name"].endswith(".sqlite3")
    assert (tmp_path / "backups" / result["name"]).exists()
    assert (tmp_path / "backups" / result["name"]).stat().st_mode % 0o1000 == 0o600
    assert service.list()[0]["name"] == result["name"]


def test_login_rate_limiter_blocks_after_configured_failures() -> None:
    original = (
        settings.auth_rate_limit_attempts,
        settings.auth_rate_limit_block_seconds,
        settings.auth_rate_limit_window_seconds,
    )
    object.__setattr__(settings, "auth_rate_limit_attempts", 2)
    object.__setattr__(settings, "auth_rate_limit_block_seconds", 60)
    object.__setattr__(settings, "auth_rate_limit_window_seconds", 60)
    try:
        limiter = LoginRateLimiter()
        assert limiter.check("admin@example.test", "127.0.0.1")[0] is True
        limiter.record_failure("admin@example.test", "127.0.0.1")
        limiter.record_failure("admin@example.test", "127.0.0.1")
        allowed, retry_after = limiter.check("admin@example.test", "127.0.0.1")
        assert allowed is False
        assert retry_after > 0
        limiter.reset("admin@example.test", "127.0.0.1")
        assert limiter.check("admin@example.test", "127.0.0.1")[0] is True
    finally:
        object.__setattr__(settings, "auth_rate_limit_attempts", original[0])
        object.__setattr__(settings, "auth_rate_limit_block_seconds", original[1])
        object.__setattr__(settings, "auth_rate_limit_window_seconds", original[2])


def test_artifact_retention_keeps_newest_and_removes_expired(tmp_path: Path) -> None:
    service = SnapshotService(tmp_path / "artifacts")
    service.export("newest")
    service.export("oldest")
    old_path = service.artifact_root / "oldest"
    os.utime(old_path, (1, 1))

    result = service.prune_artifacts(retention_days=30, keep=1)

    assert result["removed"] == ["oldest"]
    assert not old_path.exists()
    assert (service.artifact_root / "newest").exists()
