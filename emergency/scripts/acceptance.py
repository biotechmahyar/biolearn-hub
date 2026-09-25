#!/usr/bin/env python3
"""Offline acceptance gate for the complete independent emergency service.

This intentionally uses only Python's standard library and temporary storage;
it does not start a server, access the main site, or require production data.
"""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.auth_service import AuthService  # noqa: E402
from app.bootstrap_service import bootstrap_admin  # noqa: E402
from app.config import settings  # noqa: E402
from app.data_completion_service import (  # noqa: E402
    FileTransferService,
    MainSiteMigrationService,
)
from app.directory_service import UserDirectoryService  # noqa: E402
from app.learning_service import LearningService  # noqa: E402
from app.operations_service import (  # noqa: E402
    BackupService,
    ReadinessService,
    TelemetryService,
)
from app.runtime_service import RuntimeService  # noqa: E402
from app.snapshot_service import SnapshotService  # noqa: E402


def main() -> int:
    root = Path(tempfile.mkdtemp(prefix="genova-emergency-acceptance-"))
    object.__setattr__(settings, "database_path", str(root / "data" / "emergency.sqlite3"))
    object.__setattr__(settings, "artifact_root", str(root / "data" / "snapshots"))
    object.__setattr__(settings, "backup_root", str(root / "data" / "backups"))
    object.__setattr__(settings, "file_root", str(root / "data" / "files"))

    passed: list[str] = []

    def check(name: str, condition: bool) -> None:
        if not condition:
            raise RuntimeError(f"acceptance_failed:{name}")
        passed.append(name)

    auth = AuthService()
    directory = UserDirectoryService()
    learning = LearningService()
    runtime = RuntimeService()

    bootstrap_admin(
        username="acceptance-admin",
        email="acceptance-admin@example.test",
        password="Acceptance-only-password-42!",
    )
    check("bootstrap_admin", True)
    check(
        "admin_auth",
        auth.authenticate("acceptance-admin@example.test", "Acceptance-only-password-42!").role == "admin",
    )

    auth.upsert_user(
        user_id="acceptance-user",
        username="acceptance-user",
        email="acceptance-user@example.test",
        role="user",
    )
    directory.upsert_profile(user_id="acceptance-user", display_name="Acceptance User")
    check("directory_profile", directory.get_profile("acceptance-user") is not None)

    learning.upsert_category(category_id="acceptance-category", name="Biology", slug="biology")
    learning.upsert_course(
        course_id="acceptance-course",
        category_id="acceptance-category",
        title="Emergency Biology",
        slug="emergency-biology",
        status="published",
    )
    check("learning_content", learning.get_course("acceptance-course")["title"] == "Emergency Biology")

    runtime.upsert_runtime_setting(key="site.name", value="Genova Emergency")
    runtime.upsert_bot(bot_id="acceptance-bot", provider="telegram", name="Acceptance Bot")
    runtime.upsert_payment_gateway(
        gateway_id="acceptance-gateway",
        provider="local",
        display_name="Acceptance Gateway",
    )
    check("runtime_bots_payments", len(runtime.list_bots()) == 1 and len(runtime.list_payment_gateways()) == 1)

    telemetry = TelemetryService()
    telemetry.record_request(
        type("Request", (), {
            "method": "GET",
            "scope": {"route": type("Route", (), {"path": "/health/ready"})()},
        })(),
        status_code=200,
        duration_ms=2.5,
    )
    check("telemetry", telemetry.summary()["requestsLastHour"] == 1)
    check("readiness", ReadinessService().check()["status"] == "ready")

    source_file = root / "asset.bin"
    source_file.write_bytes(b"acceptance-file")
    main_export = root / "main-export.json"
    main_export.write_text(json.dumps({
        "exportedAt": "2026-09-25T00:00:00Z",
        "tables": {
            "mediaItems": [{"_id": "acceptance-media", "url": "asset.bin", "name": "asset.bin", "createdAt": 1700000000}],
            "storeProducts": [{
                "_id": "acceptance-product", "sellerId": "acceptance-user",
                "title": "Emergency Product", "slug": "emergency-product",
                "status": "approved", "price": 100, "createdAt": 1700000000,
            }],
            "notifications": [{
                "_id": "acceptance-notification", "userId": "acceptance-user",
                "title": "Welcome", "body": "Emergency ready", "createdAt": 1700000000,
            }],
        },
    }), encoding="utf-8")
    migration = MainSiteMigrationService(
        files_directory=root,
        file_service=FileTransferService(root / "data" / "files"),
        backup_service=BackupService(root / "data" / "backups"),
    )
    check("main_export_dry_run", migration.run(main_export, dry_run=True)["dryRun"] is True)
    check("main_export_import", migration.run(main_export)["replayed"] is False)
    check("main_export_replay", migration.run(main_export)["replayed"] is True)

    snapshots = SnapshotService(
        root / "data" / "snapshots",
        backup_root=root / "data" / "snapshot-backups",
    )
    exported = snapshots.export("acceptance-complete", include_secrets=True)
    counts = exported["manifest"]["record_counts"]
    check(
        "snapshot_completed_sections",
        counts["commerce"] > 0 and counts["communication"] > 0 and counts["files"] == 1,
    )
    check("snapshot_validation", snapshots.validate("acceptance-complete")["valid"] is True)
    check("snapshot_import", snapshots.import_artifact("acceptance-complete")["replayed"] is False)

    backup = BackupService(root / "data" / "backups").create(reason="acceptance")
    check("backup_creation", Path(backup["path"]).is_file())
    check(
        "backup_verification",
        BackupService(root / "data" / "backups").verify(backup["name"])["valid"] is True,
    )

    shutil.rmtree(root, ignore_errors=True)
    print(json.dumps({
        "ok": True,
        "checks": passed,
        "temporaryRootRemoved": True,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        raise SystemExit(1)
