# Genova Emergency

Independent fallback service for Genova. This directory is intentionally separate from the main Vite/Convex application.

## Current phase

Phase 1 establishes a runnable Python service:

- FastAPI application
- Environment-based configuration
- Local SQLite readiness check
- Health endpoint
- Separate test setup

Authentication, snapshot import, and Genova data models are intentionally not implemented yet.

## Run locally

From this directory:

```bash
cd emergency/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
EMERGENCY_DATABASE_PATH=./data/emergency.sqlite3 uvicorn app.main:app --reload
```

Then open:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/health
```

Configuration is supplied through environment variables. Do not put secrets in this repository.

## Planned structure

```text
emergency/
├── backend/       # independent Python API
├── frontend/      # independent emergency UI
├── database/      # local database and future schema
├── scripts/       # export/import and maintenance tools
├── docs/          # architecture and operating notes
└── tests/         # cross-service checks
```

## Phases

1. Independent service scaffold — current
2. Snapshot data model
3. Full authentication/session compatibility
4. Users, profiles, and roles
5. Courses and learning data
6. Sessions, tokens, bots, payments, and runtime configuration
7. Emergency admin panel and import/export tooling
8. Independent user interface
9. End-to-end migration and recovery tests
10. Documentation and deployment
