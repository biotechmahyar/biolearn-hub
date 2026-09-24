# Emergency architecture

## Phase-one boundary

The emergency service is a separate process and database. It has no import-time dependency on the main Vite application, Convex, or Freebuff.

```text
Main Genova app  ── later snapshot/export ──>  Emergency service
                                              ├── FastAPI
                                              ├── SQLite/PostgreSQL
                                              └── independent frontend
```

The first phase only provides the service shell and a local SQLite readiness check. The snapshot schema, identity migration, and import/export pipeline are deliberately separate tasks so each can be tested before the next one starts.
