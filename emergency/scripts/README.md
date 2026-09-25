# Emergency snapshot scripts

`snapshot.py` is a dependency-free CLI for the local artifact pipeline. `bootstrap_admin.py` creates the first local admin interactively, and `acceptance.py` runs the final offline release gate.

## Commands

```bash
python3 emergency/scripts/snapshot.py list
python3 emergency/scripts/snapshot.py export <artifact-name> [--source-version <value>]
python3 emergency/scripts/snapshot.py validate <artifact-name>
python3 emergency/scripts/snapshot.py import <artifact-name> [--allow-older-recovery]
python3 emergency/scripts/snapshot.py backup
python3 emergency/scripts/snapshot.py prune [--telemetry-days 30] [--artifact-days 30] [--artifact-keep 14] [--backup-days 30]
python3 emergency/scripts/snapshot.py migrate-main --input ./main-export.json [--files-dir ./main-files] [--id-map ./id-map.json] [--dry-run] [--force-replay] [--public-media]
python3 emergency/scripts/snapshot.py verify-backup <backup-name>.sqlite3
python3 emergency/scripts/bootstrap_admin.py --username admin --email admin@example.com
python3 emergency/scripts/acceptance.py
```

Add `--include-secrets` to `export` only for a protected recovery artifact. This includes raw signing keys, live token values, secret runtime settings, and bot/payment configs containing secret-like keys.

## Safety

- names are restricted to safe directory names; path traversal and symlinks are rejected
- generated files use owner-only permissions
- manifest/data are capped at 100 MiB
- `data.json` is protected by SHA-256 in `manifest.json`
- import validates the complete relationship graph before writing
- import is transactional and exact replay is a no-op
- older snapshots are rejected unless recovery is explicitly requested
- every real import first creates a private online SQLite backup and verifies `PRAGMA integrity_check`
- retention commands delete only expired telemetry, backups and artifacts outside the newest keep window
- `migrate-main` accepts only a local JSON export; it never connects to Convex or imports the main application
- missing user/course/product relationships abort before writes and appear in diagnostics
- file lookup is restricted to the explicit payload directory, and transferred payloads are SHA-256 content-addressed
- source export hash makes an identical migration a no-op replay

Never commit generated artifacts, real database files, credentials, or secret-bearing exports.
