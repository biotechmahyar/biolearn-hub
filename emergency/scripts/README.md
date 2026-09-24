# Emergency snapshot scripts

`snapshot.py` is a dependency-free CLI for the local artifact pipeline.

## Commands

```bash
python3 emergency/scripts/snapshot.py list
python3 emergency/scripts/snapshot.py export <artifact-name> [--source-version <value>]
python3 emergency/scripts/snapshot.py validate <artifact-name>
python3 emergency/scripts/snapshot.py import <artifact-name> [--allow-older-recovery]
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

Never commit generated artifacts, real database files, credentials, or secret-bearing exports.
