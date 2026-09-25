# Emergency admin frontend

A standalone, build-free RTL operations panel served by FastAPI at `/admin/`.

- no React, Vite, Tailwind, Convex or main-site imports
- no external fonts, scripts, CDNs or analytics
- Bearer token stored only in browser `sessionStorage`
- live/readiness health, local telemetry and verified backup controls
- table and route-template inventory without sensitive request data
- commerce, communication, file-transfer and latest migration status
- imported file references redact URL query/fragment values
- artifact export, listing, checksum/contract validation and transactional import
- explicit warning before creating an artifact with raw recovery secrets
- explicit checkbox required for older-snapshot rollback
- API records and secret values are never rendered in the inventory

The panel is protected by the same emergency auth service and admin role checks as the API. It never renders raw artifact records, telemetry request bodies, stack traces, backup paths, or secret values. Static assets are mounted by `app/main.py`; there is no frontend build step.
