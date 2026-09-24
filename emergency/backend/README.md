# Emergency backend

FastAPI application for the independent Genova emergency runtime.

## Modules

- `app/main.py` — API routes, Bearer auth, admin authorization and `/admin` static panel mount
- `app/db.py` — local SQLite schema and foreign-key connection
- `app/auth_service.py` — imported/local passwords, opaque sessions, tokens and signing keys
- `app/directory_service.py` — users, profiles, roles and assignments
- `app/learning_service.py` — content, learning progress and assessments
- `app/runtime_service.py` — runtime settings, bots, gateways, transactions and redaction
- `app/snapshot_contract.py` — Snapshot v1 manifest contract
- `app/snapshot_service.py` — artifact export, validation and transactional import
- `app/operations_service.py` — readiness, privacy-safe telemetry, verified backups and retention
- `app/security.py` — bounded process-local login abuse limiter and safe request IDs

## Phase 7 admin API

All endpoints require an emergency Bearer token whose role is one of `admin`, `superadmin`, `super_admin`, or `owner`.

- `GET /api/admin/emergency/overview`
- `GET /api/admin/snapshots`
- `POST /api/admin/snapshots/export`
- `POST /api/admin/snapshots/{name}/validate`
- `POST /api/admin/snapshots/{name}/import`
- `GET /api/admin/emergency/metrics`
- `GET|POST /api/admin/backups`
- `POST /api/admin/maintenance/prune`

The export API returns metadata and diagnostics only; it never returns artifact records or secret values. `artifactName` is a logical directory name and never an arbitrary filesystem path.

## Database additions

- `emergency_snapshot_imports` tracks version ordering and exact replay
- `emergency_audit_events` tracks snapshot export/import operations
- `emergency_request_metrics` stores minute-level route-template aggregates
- `emergency_error_events` stores request IDs, exception types and short hashes only

The import path validates relationships, creates and integrity-checks an online SQLite backup, then starts `BEGIN IMMEDIATE`. It performs source-ID upserts in dependency order, records the import and audit event, then commits once. Any SQL failure rolls back the full import.

## Local development

```bash
pip install -r emergency/backend/requirements.txt
uvicorn app.main:app --app-dir emergency/backend --reload
```

Do not add imports from the main Vite/Convex application. This backend and its panel must remain operable when the primary site is unavailable.
