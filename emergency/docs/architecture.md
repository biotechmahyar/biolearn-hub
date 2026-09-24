# Emergency architecture

## Runtime boundary

The emergency system is a separate FastAPI + SQLite application rooted at `emergency/`. Its runtime dependency graph does not include the primary TypeScript application, Convex, Freebuff, Vite, React, or the primary site database. The emergency service can therefore start and operate while the main deployment is unavailable.

## Layers

1. **HTTP/API** — compatibility auth, directory, content, learning, assessment, runtime, bot, payment and admin snapshot routes.
2. **Domain services** — idempotent domain rules and redacted read models.
3. **SQLite** — local durable state with foreign keys enabled on every connection.
4. **Snapshot service** — versioned artifact export, validation, preflight, transactional import, replay and audit.
5. **Standalone admin UI** — static HTML/CSS/JS mounted at `/admin`, with no build pipeline.

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

The 18-section Snapshot v1 contract is materialized from every currently implemented table. Commerce, communication and files remain explicit empty placeholders until their persistence phases exist; they are not silently omitted.

## Security model

- all admin API routes reuse emergency Bearer authentication and `UserDirectoryService.require_admin`
- artifact API input is a logical name, never a path
- path traversal and symlinks are rejected
- files are owner-readable/writable only
- non-secret exports exclude raw tokens, signing keys, secret settings and secret-bearing bot/payment configs
- full recovery exports are explicitly marked and must be transported as protected files
- API and UI return metadata/diagnostics, not secret-bearing artifact records
- imports are versioned, relationship-preflighted, transactional, replay-safe and audited

## Phase status

- Phase 1–6: complete
- Phase 7: emergency admin panel and import/export tooling — complete
- Phase 8: current next boundary; not started without approval
