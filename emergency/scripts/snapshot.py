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
    export_parser.add_argument("--source-version", default="emergency-0.7.0")

    validate_parser = subparsers.add_parser("validate", help="Validate an artifact")
    validate_parser.add_argument("name")

    import_parser = subparsers.add_parser("import", help="Validate and transactionally import an artifact")
    import_parser.add_argument("name")
    import_parser.add_argument(
        "--allow-older-recovery",
        action="store_true",
        help="Explicitly allow an artifact older than the latest imported snapshot",
    )
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
        else:
            result = service.import_artifact(
                arguments.name,
                allow_older_recovery=arguments.allow_older_recovery,
            )
    except SnapshotError as error:
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
