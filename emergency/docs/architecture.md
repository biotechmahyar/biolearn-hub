# Emergency architecture

## Runtime boundary

The emergency system is a separate FastAPI + SQLite application rooted at `emergency/`. Its runtime dependency graph does not include the primary TypeScript application, Convex, Freebuff, Vite, React, or the primary site database. The emergency service can therefore start and operate while the main deployment is unavailable.

## Layers

1. **HTTP/API** — compatibility auth, directory, content, learning, assessment, runtime, bot, payment and admin snapshot routes.
2. **Domain services** — idempotent domain rules and redacted read models.
3. **SQLite** — local durable state with foreign keys enabled on every connection.
4. **Snapshot service** — versioned artifact export, validation, preflight, verified pre-import backup, transactional import, replay and audit.
5. **Operations layer** — live/readiness probes, low-cardinality local telemetry, Prometheus output, retention and consistent SQLite backups.
6. **One-time data completion** — local main-export mapper, relationship preflight, transaction/idempotency, file payload transfer and migration audit.
7. **Standalone admin UI** — static HTML/CSS/JS mounted at `/admin`, with no build pipeline.

## Snapshot flow

```text
Emergency SQLite
  └─ export ──> artifact directory
                  ├─ manifest.json
                  └─ data.json + SHA-256
                         │
                  validate/preflight
                         │
                  BEGIN IMMEDIATE
                         │
             dependency-order upserts
                         │
               audit + import history
                         │
                    COMMIT / ROLLBACK
```

The 18-section Snapshot v1 contract is materialized from every implemented table. Commerce, communication and files are now fully represented by phase-nine tables and the main-export migration tool; the one-time tool is not part of emergency runtime startup.

## Security model

- all admin API routes reuse emergency Bearer authentication and `UserDirectoryService.require_admin`
- artifact API input is a logical name, never a path
- path traversal and symlinks are rejected
- files are owner-readable/writable only
- non-secret exports exclude raw tokens, signing keys, secret settings and secret-bearing bot/payment configs
- full recovery exports are explicitly marked and must be transported as protected files
- API and UI return metadata/diagnostics, not secret-bearing artifact records
- imports are versioned, relationship-preflighted, backed up, transactional, replay-safe and audited
- telemetry stores route templates and fingerprints, not request content or exception messages
- readiness covers SQLite integrity, disk capacity, artifact storage and backup storage
- Nginx/systemd examples enforce TLS termination, bounded bodies, coarse rate limits and a single writer process

## Phase status

- Phase 1–6: complete
- Phase 7: emergency admin panel and import/export tooling — complete
- Phase 8: production/telemetry hardening, verified backup/retention and rollout references — complete
- Phase 9: commerce, communication, files and one-time main-export migration — complete
