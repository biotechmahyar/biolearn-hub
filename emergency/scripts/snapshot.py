#!/usr/bin/env python3
"""Operational CLI for emergency snapshot artifacts.

Examples:
  python3 emergency/scripts/snapshot.py list
  python3 emergency/scripts/snapshot.py export backup-2026-09-24
  python3 emergency/scripts/snapshot.py export recovery --include-secrets
  python3 emergency/scripts/snapshot.py validate backup-2026-09-24
  python3 emergency/scripts/snapshot.py import backup-2026-09-24
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings  # noqa: E402
from app.data_completion_service import (  # noqa: E402
    MainSiteMigrationError,
    MainSiteMigrationService,
)
from app.operations_service import (  # noqa: E402
    BackupService,
    TelemetryService,
)
from app.snapshot_service import (  # noqa: E402
    SnapshotError,
    SnapshotService,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Genova emergency snapshot tooling")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List safe snapshot artifact directories")

    export_parser = subparsers.add_parser("export", help="Export the emergency database")
    export_parser.add_argument("name", help="Artifact directory name (no path separators)")
    export_parser.add_argument(
        "--include-secrets",
        action="store_true",
        help="Include raw signing keys, live tokens, and secret runtime configuration",
    )
    export_parser.add_argument("--source-version", default="emergency-0.10.0")

    validate_parser = subparsers.add_parser("validate", help="Validate an artifact")
    validate_parser.add_argument("name")

    import_parser = subparsers.add_parser("import", help="Validate and transactionally import an artifact")
    import_parser.add_argument("name")
    import_parser.add_argument(
        "--allow-older-recovery",
        action="store_true",
        help="Explicitly allow an artifact older than the latest imported snapshot",
    )

    backup_parser = subparsers.add_parser("backup", help="Create a verified online SQLite backup")
    verify_parser = subparsers.add_parser("verify-backup", help="Verify an existing SQLite backup")
    verify_parser.add_argument("name")

    prune_parser = subparsers.add_parser("prune", help="Apply telemetry, artifact, and backup retention")
    prune_parser.add_argument("--telemetry-days", type=int, default=settings.telemetry_retention_days)
    prune_parser.add_argument("--artifact-days", type=int, default=settings.artifact_retention_days)
    prune_parser.add_argument("--artifact-keep", type=int, default=settings.artifact_retention_keep)
    prune_parser.add_argument("--backup-days", type=int, default=settings.backup_retention_days)

    migration_parser = subparsers.add_parser(
        "migrate-main",
        help="Validate or idempotently merge a one-time main-site JSON export",
    )
    migration_parser.add_argument("--input", required=True, help="Path to exportBackup JSON output")
    migration_parser.add_argument(
        "--files-dir",
        help="Directory containing one-time file payloads named by storage ID, URL basename, or reference hash",
    )
    migration_parser.add_argument(
        "--id-map",
        help="Optional JSON object with keys such as users:<source-id> or courses:<source-id>",
    )
    migration_parser.add_argument("--dry-run", action="store_true")
    migration_parser.add_argument("--force-replay", action="store_true")
    migration_parser.add_argument("--public-media", action="store_true")
    return parser


def main() -> int:
    arguments = _parser().parse_args()
    service = SnapshotService()
    try:
        if arguments.command == "list":
            result: object = service.list_artifacts()
        elif arguments.command == "export":
            result = service.export(
                arguments.name,
                include_secrets=arguments.include_secrets,
                source_version=arguments.source_version,
            )
        elif arguments.command == "validate":
            result = service.validate(arguments.name)
        elif arguments.command == "import":
            result = service.import_artifact(
                arguments.name,
                allow_older_recovery=arguments.allow_older_recovery,
            )
        elif arguments.command == "backup":
            result = BackupService().create(reason="manual")
        elif arguments.command == "verify-backup":
            result = BackupService().verify(arguments.name)
        elif arguments.command == "migrate-main":
            id_map: dict[str, str] = {}
            if arguments.id_map:
                id_map_path = Path(arguments.id_map).expanduser().resolve()
                if id_map_path.stat().st_size > 10 * 1024 * 1024:
                    raise MainSiteMigrationError("id_map_too_large")
                loaded_map = json.loads(id_map_path.read_text(encoding="utf-8"))
                if not isinstance(loaded_map, dict) or not all(
                    isinstance(key, str) and isinstance(value, str) for key, value in loaded_map.items()
                ):
                    raise MainSiteMigrationError("invalid_id_map")
                id_map = loaded_map
            result = MainSiteMigrationService(
                id_map=id_map,
                files_directory=arguments.files_dir,
            ).run(
                arguments.input,
                dry_run=arguments.dry_run,
                force_replay=arguments.force_replay,
                public_media=arguments.public_media,
            )
        else:
            result = {
                "telemetry": TelemetryService().prune(
                    retention_days=arguments.telemetry_days
                ),
                "artifacts": service.prune_artifacts(
                    retention_days=arguments.artifact_days,
                    keep=arguments.artifact_keep,
                ),
                "backups": BackupService().prune(
                    retention_days=arguments.backup_days
                ),
            }
    except (SnapshotError, MainSiteMigrationError, OSError, ValueError) as error:
        errors = getattr(error, "errors", None)
        print(
            json.dumps(
                {"ok": False, "error": str(error), "diagnostics": errors or []},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 1

    print(json.dumps({"ok": True, **({"result": result} if not isinstance(result, list) else {"result": result})}, ensure_ascii=False, indent=2))
    if arguments.command == "validate" and isinstance(result, dict) and not result.get("valid"):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
