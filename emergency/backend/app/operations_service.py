"""Local-first production operations for the emergency runtime.

Telemetry is aggregated in the emergency SQLite database and deliberately
stores route templates rather than raw paths, query strings, request bodies,
authorization headers, client IPs, or exception messages.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import time
from typing import Any

from .config import settings
from .db import connect


_SAFE_REASON = re.compile(r"[^A-Za-z0-9._-]+")
_KNOWN_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}


def _now() -> int:
    return int(time.time())


def _safe_reason(value: str) -> str:
    normalized = _SAFE_REASON.sub("-", value.strip().lower()).strip("-")
    return normalized[:48] or "manual"


def _prometheus_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


class TelemetryService:
    """Low-cardinality request aggregates and redacted error fingerprints."""

    def __init__(self) -> None:
        self.started_at = time.time()

    @staticmethod
    def _route(request: Any) -> str:
        route = getattr(request.scope.get("route"), "path", None)
        if isinstance(route, str) and route:
            return route[:160]
        return "__unmatched__"

    @staticmethod
    def _method(request: Any) -> str:
        method = str(request.method or "UNKNOWN").upper()
        return method if method in _KNOWN_METHODS else "OTHER"

    def record_request(
        self,
        request: Any,
        *,
        status_code: int,
        duration_ms: float,
    ) -> None:
        if not settings.request_telemetry_enabled:
            return
        minute = int(time.time() // 60) * 60
        method = self._method(request)
        route = self._route(request)
        status_class = int(status_code // 100)
        bounded_duration = max(0.0, min(float(duration_ms), 3_600_000.0))
        try:
            with connect() as connection:
                connection.execute(
                    """
                    INSERT INTO emergency_request_metrics
                        (minute, method, route, status_class, request_count,
                         duration_total_ms, max_duration_ms)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                    ON CONFLICT(minute, method, route, status_class) DO UPDATE SET
                        request_count=request_count + 1,
                        duration_total_ms=duration_total_ms + excluded.duration_total_ms,
                        max_duration_ms=MAX(max_duration_ms, excluded.max_duration_ms)
                    """,
                    (minute, method, route, status_class, bounded_duration, bounded_duration),
                )
        except sqlite3.Error:
            # Telemetry must never turn a healthy request into a failure.
            return

    def record_error(self, request: Any, error: Exception, *, request_id: str) -> None:
        route = self._route(request)
        method = self._method(request)
        fingerprint = hashlib.sha256(
            f"{type(error).__name__}:{str(error)}".encode("utf-8", errors="replace")
        ).hexdigest()[:16]
        try:
            with connect() as connection:
                connection.execute(
                    """
                    INSERT INTO emergency_error_events
                        (id, request_id, occurred_at, method, route,
                         exception_type, message_fingerprint)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"error:{request_id}:{_now()}:{secrets.token_hex(4)}",
                        request_id,
                        _now(),
                        method,
                        route,
                        type(error).__name__[:120],
                        fingerprint,
                    ),
                )
        except sqlite3.Error:
            return

    def summary(self, *, error_limit: int = 10) -> dict[str, Any]:
        now = _now()
        with connect() as connection:
            totals = connection.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN minute >= ? THEN request_count ELSE 0 END), 0) AS last_hour,
                    COALESCE(SUM(request_count), 0) AS stored,
                    COALESCE(SUM(duration_total_ms), 0) AS duration_total_ms,
                    COALESCE(MAX(max_duration_ms), 0) AS max_duration_ms
                FROM emergency_request_metrics
                WHERE minute >= ?
                """,
                (now - 3600, now - 86400),
            ).fetchone()
            errors = connection.execute(
                """
                SELECT id, request_id, occurred_at, method, route,
                       exception_type, message_fingerprint
                FROM emergency_error_events
                WHERE occurred_at >= ?
                ORDER BY occurred_at DESC LIMIT ?
                """,
                (now - 86400, min(max(error_limit, 1), 50)),
            ).fetchall()
            route_rows = connection.execute(
                """
                SELECT method, route,
                       SUM(request_count) AS request_count,
                       ROUND(SUM(duration_total_ms) / NULLIF(SUM(request_count), 0), 2) AS average_duration_ms,
                       MAX(max_duration_ms) AS max_duration_ms
                FROM emergency_request_metrics
                WHERE minute >= ?
                GROUP BY method, route
                ORDER BY request_count DESC, route
                LIMIT 20
                """,
                (now - 86400,),
            ).fetchall()
        total_24h = int(totals["stored"] or 0)
        return {
            "processUptimeSeconds": int(max(0, time.time() - self.started_at)),
            "serviceStartedAt": int(self.started_at),
            "requestsLastHour": int(totals["last_hour"] or 0),
            "requestsStored": total_24h,
            "averageDurationMs": round(float(totals["duration_total_ms"] or 0) / total_24h, 2)
            if total_24h
            else 0,
            "maxDurationMs": round(float(totals["max_duration_ms"] or 0), 2),
            "routes": [dict(row) for row in route_rows],
            "recentErrors": [dict(row) for row in errors],
            "privacy": {
                "rawPaths": False,
                "queryStrings": False,
                "requestBodies": False,
                "authorizationHeaders": False,
                "clientIps": False,
                "exceptionMessages": False,
            },
        }

    def prometheus_metrics(self) -> str:
        summary = self.summary(error_limit=1)
        lines = [
            "# HELP genova_emergency_up Whether the emergency process is running.",
            "# TYPE genova_emergency_up gauge",
            "genova_emergency_up 1",
            "# HELP genova_emergency_process_uptime_seconds Process uptime.",
            "# TYPE genova_emergency_process_uptime_seconds gauge",
            f"genova_emergency_process_uptime_seconds {summary['processUptimeSeconds']}",
            "# HELP genova_emergency_http_requests_last_hour Aggregated request count.",
            "# TYPE genova_emergency_http_requests_last_hour gauge",
            f"genova_emergency_http_requests_last_hour {summary['requestsLastHour']}",
        ]
        for route in summary["routes"]:
            labels = (
                f'method="{_prometheus_escape(str(route["method"]))}",'
                f'route="{_prometheus_escape(str(route["route"]))}"'
            )
            lines.extend(
                [
                    "# HELP genova_emergency_http_route_requests_24h Requests grouped by route template.",
                    "# TYPE genova_emergency_http_route_requests_24h gauge",
                    f"genova_emergency_http_route_requests_24h{{{labels}}} {int(route['request_count'])}",
                    "# HELP genova_emergency_http_route_average_duration_ms Average duration.",
                    "# TYPE genova_emergency_http_route_average_duration_ms gauge",
                    f"genova_emergency_http_route_average_duration_ms{{{labels}}} {float(route['average_duration_ms'])}",
                ]
            )
        return "\n".join(lines) + "\n"

    def prune(self, *, retention_days: int) -> dict[str, int]:
        bounded_days = min(max(int(retention_days), 1), 3650)
        cutoff = _now() - bounded_days * 86400
        with connect() as connection:
            metrics = connection.execute(
                "DELETE FROM emergency_request_metrics WHERE minute < ?", (cutoff,)
            ).rowcount
            errors = connection.execute(
                "DELETE FROM emergency_error_events WHERE occurred_at < ?", (cutoff,)
            ).rowcount
        return {"requestMetricRows": int(metrics), "errorEvents": int(errors)}


class ReadinessService:
    """Dependency-free readiness checks suitable for a local outage."""

    @staticmethod
    def _path_ready(path_value: str) -> dict[str, Any]:
        path = Path(path_value).expanduser()
        probe = path if path.exists() else path.parent
        return {
            "ready": probe.exists() and probe.is_dir() and os.access(probe, os.W_OK),
            "path": str(path),
        }

    def check(self) -> dict[str, Any]:
        database_ready = False
        integrity = "unavailable"
        database_error: str | None = None
        try:
            with connect() as connection:
                integrity = str(connection.execute("PRAGMA quick_check").fetchone()[0])
                database_ready = integrity == "ok"
        except sqlite3.Error as error:
            database_error = type(error).__name__

        database_path = Path(settings.database_path).expanduser()
        disk_probe = database_path if database_path.exists() else database_path.parent
        free_bytes: int | None = None
        disk_ready = False
        try:
            free_bytes = int(shutil.disk_usage(disk_probe).free)
            disk_ready = free_bytes >= 64 * 1024 * 1024
        except OSError:
            pass
        artifact = self._path_ready(settings.artifact_root)
        backup = self._path_ready(settings.backup_root)
        files = self._path_ready(settings.file_root)
        ready = all((database_ready, disk_ready, artifact["ready"], backup["ready"], files["ready"]))
        return {
            "status": "ready" if ready else "not_ready",
            "checkedAt": _now(),
            "components": {
                "database": {"ready": database_ready, "integrity": integrity, "error": database_error},
                "disk": {"ready": disk_ready, "freeBytes": free_bytes},
                "artifactStorage": artifact,
                "backupStorage": backup,
                "fileStorage": files,
            },
        }


class BackupService:
    """Consistent SQLite online backups with private staging and verification."""

    def __init__(self, backup_root: str | Path | None = None) -> None:
        self.backup_root = Path(backup_root or settings.backup_root).expanduser().resolve()

    def create(self, *, reason: str = "manual") -> dict[str, Any]:
        self.backup_root.mkdir(mode=0o700, parents=True, exist_ok=True)
        name = f"{_safe_reason(reason)}-{int(time.time())}-{secrets.token_hex(4)}.sqlite3"
        destination = self.backup_root / name
        staging = self.backup_root / f".building-{secrets.token_hex(8)}.sqlite3"
        try:
            source = sqlite3.connect(settings.database_path, timeout=30)
            target = sqlite3.connect(staging)
            try:
                source.backup(target)
                target.commit()
            finally:
                target.close()
                source.close()
            os.chmod(staging, 0o600)
            check_connection = sqlite3.connect(staging)
            try:
                integrity = str(check_connection.execute("PRAGMA integrity_check").fetchone()[0])
            finally:
                check_connection.close()
            if integrity != "ok":
                raise RuntimeError("backup_integrity_check_failed")
            if destination.exists() or destination.is_symlink():
                raise RuntimeError("backup_name_collision")
            os.replace(staging, destination)
        except Exception:
            try:
                staging.unlink(missing_ok=True)
            except OSError:
                pass
            raise
        return {
            "name": destination.name,
            "path": str(destination),
            "sizeBytes": destination.stat().st_size,
            "createdAt": int(destination.stat().st_mtime),
        }

    def list(self) -> list[dict[str, Any]]:
        if not self.backup_root.exists():
            return []
        result: list[dict[str, Any]] = []
        for path in self.backup_root.iterdir():
            if path.suffix != ".sqlite3" or path.is_symlink() or not path.is_file():
                continue
            stat = path.stat()
            result.append({
                "name": path.name,
                "sizeBytes": stat.st_size,
                "createdAt": int(stat.st_mtime),
            })
        return sorted(result, key=lambda item: item["createdAt"], reverse=True)

    def prune(self, *, retention_days: int) -> dict[str, Any]:
        bounded_days = min(max(int(retention_days), 1), 3650)
        cutoff = time.time() - bounded_days * 86400
        removed: list[str] = []
        if not self.backup_root.exists():
            return {"removed": removed, "remaining": 0}
        for path in self.backup_root.iterdir():
            if path.suffix != ".sqlite3" or path.is_symlink() or not path.is_file():
                continue
            if path.stat().st_mtime < cutoff:
                path.unlink()
                removed.append(path.name)
        return {"removed": removed, "remaining": len(self.list())}


class MaintenanceService:
    def __init__(
        self,
        *,
        telemetry: TelemetryService | None = None,
        backups: BackupService | None = None,
    ) -> None:
        self.telemetry = telemetry or TelemetryService()
        self.backups = backups or BackupService()

    def prune(
        self,
        *,
        telemetry_days: int,
        backup_days: int,
    ) -> dict[str, Any]:
        return {
            "telemetry": self.telemetry.prune(retention_days=telemetry_days),
            "backups": self.backups.prune(retention_days=backup_days),
        }
