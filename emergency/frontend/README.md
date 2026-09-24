# Emergency admin frontend

A standalone, build-free RTL operations panel served by FastAPI at `/admin/`.

- no React, Vite, Tailwind, Convex or main-site imports
- no external fonts, scripts, CDNs or analytics
- Bearer token stored only in browser `sessionStorage`
- health and table inventory
- artifact export, listing, checksum/contract validation and transactional import
- explicit warning before creating an artifact with raw recovery secrets
- explicit checkbox required for older-snapshot rollback
- API records and secret values are never rendered in the inventory

The panel is protected by the same emergency auth service and admin role checks as the API. Static assets are mounted by `app/main.py`; there is no frontend build step.
