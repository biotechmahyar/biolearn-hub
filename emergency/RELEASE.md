# Genova Emergency release 0.10.0

Release type: final independent fallback launch candidate
Runtime boundary: `emergency/` only; no Vite, Convex, Freebuff or main-site imports.

## Included phases

- Phase 1: FastAPI + SQLite foundation
- Phase 2: Snapshot v1 contract
- Phase 3: auth, sessions, tokens, signing keys
- Phase 4: users, profiles, roles
- Phase 5: content, learning, assessments
- Phase 6: runtime, bots, payments
- Phase 7: export/import, validation, recovery admin panel
- Phase 8: readiness, telemetry, security headers, backup and retention
- Phase 9: commerce, communication, files and one-time main-export migration
- Phase 10: final bootstrap, acceptance gate, backup verification and launch package

## Supported data sections

`identity`, `auth_accounts`, `auth_sessions`, `auth_tokens`, `auth_secrets`,
`profiles`, `roles`, `content`, `learning`, `assessments`, `commerce`,
`communication`, `platform_settings`, `bots`, `payments`, `files`, `audit`.

The main-site runtime is never needed to import these sections. The one-time
migration command accepts a local JSON export and an optional local file
payload directory.

## Safety gates

- no default admin password; bootstrap is interactive
- PBKDF2-SHA256 password hashing with unique salt
- SQLite backups before migration/import and `integrity_check`
- artifact name/path traversal and symlink protection
- source relationship preflight before writes
- transactional migration/import with rollback
- source hash replay protection
- secret-bearing exports and files marked/redacted explicitly
- request telemetry excludes bodies, raw paths, IPs, auth headers and exception text
- readiness checks database, disk, artifact, backup and file storage

## Launch command

```bash
python3 emergency/scripts/bootstrap_admin.py --username admin --email admin@example.com
python3 emergency/scripts/acceptance.py
python3 emergency/scripts/snapshot.py backup
```

Then configure `/etc/genova-emergency/emergency.env`, install the systemd/Nginx
references from `emergency/deploy/`, and run the service with one Uvicorn worker.
Do not run the acceptance script against a production database; it uses a
temporary database and deletes its temporary root on success.
