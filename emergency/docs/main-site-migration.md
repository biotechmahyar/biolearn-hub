# One-time Genova main-site data migration

Phase `9` completes the `commerce`, `communication`, and `files` sections of the
emergency Snapshot v1 contract. The tool is an offline migration utility. It
does not import, query, or call the primary Vite/Convex application.

## Input format

The main site export is a JSON object shaped like:

```json
{
  "ok": true,
  "exportedAt": "2026-09-25T12:00:00.000Z",
  "tables": {
    "storeProducts": [],
    "orders": [],
    "notifications": []
  }
}
```

A plain object whose values are table arrays is also accepted. The importer
preserves the `_id`/`id` value as the emergency source ID and converts Convex
millisecond timestamps to emergency seconds. Monetary values are not silently
converted; the original Toman amount is retained and marked with
`sourceUnit=toman` metadata.

The current main export may not contain every optional table. Missing optional
tables are simply absent. A record whose required user, course, product or
parent relationship is missing aborts the migration before any write and emits
a diagnostic.

## File payloads

JSON references and URLs are not treated as a complete file transfer. Download
or stage the actual files separately in a private directory:

```text
main-files/
├── storage-id-or-file-name.pdf
├── another-storage-id.bin
└── <sha256-of-reference>
```

The importer accepts only direct children of `--files-dir`; it rejects symlinks
and path traversal. Each accepted file is limited by
`EMERGENCY_MAX_FILE_BYTES`, hashed with SHA-256 and copied to:

```text
EMERGENCY_FILE_ROOT/<first-two-hash-characters>/<sha256>
```

Files default to sensitive. `--public-media` marks `mediaItems` payloads as
public. A missing payload is recorded in `emergency_file_manifest` with
`status=missing` and reported as a warning; it is never silently represented as
transferred.

## ID mapping

When emergency IDs differ from Convex IDs, create a JSON object:

```json
{
  "users:convex-user-id": "emergency-user-id",
  "courses:convex-course-id": "emergency-course-id",
  "commerce_products:convex-product-id": "emergency-product-id"
}
```

Pass it with `--id-map`. User mappings are used consistently across commerce,
notifications, support, mentor, wallet and direct-message relationships.

## Dry run

Always validate first:

```bash
python3 emergency/scripts/snapshot.py migrate-main \
  --input /secure/path/main-export.json \
  --files-dir /secure/path/main-files \
  --id-map /secure/path/id-map.json \
  --dry-run
```

Review record counts, missing files and relationship errors. Dry-run validates
file hashes but does not copy or write them.

## Import

```bash
python3 emergency/scripts/snapshot.py migrate-main \
  --input /secure/path/main-export.json \
  --files-dir /secure/path/main-files \
  --id-map /secure/path/id-map.json
```

The importer:

1. limits the export to 250 MiB and rejects symlinks;
2. computes a SHA-256 source hash;
3. returns `replayed: true` for an already completed identical export;
4. optionally creates a verified SQLite backup;
5. installs private content-addressed payloads;
6. starts `BEGIN IMMEDIATE` and upserts commerce, communication and files;
7. writes `emergency_migration_runs` and `emergency_audit_events`;
8. commits once, or rolls back all database writes on failure.

Use `--force-replay` only when a deliberate reapplication is required.

## Completed sections

### Commerce

- products and store products
- course orders and marketplace orders
- coupons and store coupons
- reviews
- wallets and wallet transactions
- payments, offline payments and instructor payments
- paid subscriptions

### Communication

- notifications
- announcements
- inbox messages
- support tickets/messages
- direct and store messages
- mentor groups/members/questions/sessions
- comments

### Files

- source storage reference
- name, MIME and size
- SHA-256
- private local payload path
- availability status
- sensitivity and source metadata

## Verification

Admin APIs require the emergency Bearer admin token:

```text
GET /api/admin/data-completion/summary
GET /api/admin/data-completion/products
GET /api/admin/data-completion/files
GET /api/admin/data-completion/migrations
```

User-scoped compatibility endpoints:

```text
GET /api/commerce/me/orders
GET /api/communication/me/notifications
```

After import, create a normal emergency Snapshot v1. The `commerce`,
`communication` and `files` sections now contain the migrated records and are
included in manifest counts and validation.

## Safety notes

- Keep the source export, ID map and raw file directory outside the repository.
- Do not edit or expose the source export to the emergency web process.
- Back up the emergency database before the first run.
- A same-hash replay is safe; use a new export hash for a later source export.
- File payload status must be reviewed before declaring the migration complete.
