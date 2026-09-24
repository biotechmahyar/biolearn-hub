# Emergency architecture

## Current boundary

The emergency service is a separate process and database. It has no import-time dependency on the main Vite application, Convex, or Freebuff.

```text
Main Genova app  ── later snapshot/export ──>  Emergency service
                                              ├── FastAPI
                                              ├── SQLite/PostgreSQL
                                              └── independent frontend
```

Phase 1 provides the service shell and a local SQLite readiness check. Phase 2 defines the versioned snapshot contract and its complete logical data sections. The snapshot exporter/importer and identity migration remain separate tasks so each can be tested before the next one starts.

See [`snapshot-contract.md`](./snapshot-contract.md) for the section list and manifest rules.
