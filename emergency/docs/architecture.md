# Emergency architecture

## Current boundary

The emergency service is a separate process and database. It has no import-time dependency on the main Vite application, Convex, or Freebuff.

```text
Main Genova app  ── later snapshot/export ──>  Emergency service
                                              ├── FastAPI
                                              ├── SQLite/PostgreSQL
                                              └── independent frontend
```

Phase 1 provides the service shell and a local SQLite readiness check. Phase 2 defines the versioned snapshot contract and its complete logical data sections. Phase 3 adds the independent auth store, password verification, local session lifecycle, imported opaque-token records, and JWT signing-key verification. Phase 4 adds profiles, academic/contact metadata, role definitions, permissions, and user-role assignments with authenticated self-service and admin APIs. The operational snapshot exporter/importer and later content migration remain separate tasks so each can be tested before the next one starts.

See [`snapshot-contract.md`](./snapshot-contract.md) for the section list and manifest rules.
