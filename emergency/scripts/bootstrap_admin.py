#!/usr/bin/env python3
"""Create the first local Emergency administrator.

The password is read interactively and is never accepted as a command-line
argument. Run this from the project root with the emergency backend importable.
"""
from __future__ import annotations

import argparse
import getpass
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.bootstrap_service import BootstrapError, bootstrap_admin  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap the first Genova Emergency admin")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument(
        "--rotate-existing",
        action="store_true",
        help="Explicitly replace the password of an existing matching identity",
    )
    args = parser.parse_args()
    password = getpass.getpass("Emergency admin password: ")
    confirmation = getpass.getpass("Repeat password: ")
    if password != confirmation:
        print(json.dumps({"ok": False, "error": "password_confirmation_mismatch"}))
        return 1
    try:
        result = bootstrap_admin(
            username=args.username,
            email=args.email,
            password=password,
            rotate_existing=args.rotate_existing,
        )
    except BootstrapError as error:
        print(json.dumps({"ok": False, "error": str(error)}))
        return 1
    print(json.dumps({"ok": True, "result": result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
