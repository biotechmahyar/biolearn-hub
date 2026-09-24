# Genova Emergency

Independent fallback service for Genova. This directory is intentionally separate from the main Vite/Convex application.

## Current phase

Phase 5 adds independent content, learning, and assessment compatibility on top of the phase 3 authentication and phase 4 directory:

- Course categories, courses, sections, lessons, metadata, and publication state
- Learner enrollment, lesson progress, learning events, and study plans
- Assessment definitions, questions, options, attempts, responses, and scoring
- Snapshot-compatible idempotent upsert methods for all phase-five records
- Public published-course catalog and authenticated learner APIs
- Admin-only view of all course states

The versioned snapshot contract remains defined in `backend/app/snapshot_contract.py` and `docs/snapshot-contract.md`. The operational snapshot exporter/importer is intentionally not implemented yet. No runtime dependency on the main Vite/Convex application exists.

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

1. Independent service scaffold — complete
2. Snapshot data model — complete
3. Full authentication/session compatibility — complete
4. Users, profiles, and roles — complete
5. Content, learning, and assessments — current
6. Bots, payments, and runtime configuration
7. Emergency admin panel and import/export tooling
8. Independent user interface
9. End-to-end migration and recovery tests
10. Documentation and deployment
