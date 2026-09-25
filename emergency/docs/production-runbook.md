# Genova Emergency production runbook

Phase: `8` — production and telemetry hardening

## Supported topology

The emergency runtime is one FastAPI process backed by one local SQLite file.
Run **one Uvicorn worker** behind Nginx or another TLS reverse proxy. This keeps
SQLite writes predictable and the in-process login limiter effective. The
service has no runtime dependency on the primary Vite/Convex application.

Reference deployment files:

- `deploy/genova-emergency.service`
- `deploy/genova-emergency-maintenance.service`
- `deploy/genova-emergency-maintenance.timer`
- `deploy/emergency.env.example`
- `deploy/nginx.conf`

Do not copy the example environment file into the repository with real secrets.
Install it as `/etc/genova-emergency/emergency.env`, owned by root and mode
`0600`. The systemd service itself runs as the dedicated
`genova-emergency` user.

## Health and monitoring

- `GET /health/live` checks only that the process can answer.
- `GET /health/ready` checks SQLite `quick_check`, free disk space, artifact
  storage, backup storage and private file storage. It returns `503` when not ready.
- `GET /api/admin/emergency/overview` shows readiness, table counts, artifact
  and backup state, plus local telemetry to an authenticated emergency admin.
- `GET /api/admin/emergency/metrics` emits Prometheus text and requires the
  same Bearer admin authorization. The endpoint is not anonymous.

Telemetry is deliberately low-cardinality and privacy-preserving. It stores
method, route template, status class, duration and counts. It does not store raw
paths, query strings, bodies, IPs, Authorization headers or exception text.
Unhandled exceptions store a one-way short fingerprint for deduplication.

An external collector such as OpenObserve or a private Prometheus-compatible
stack can scrape the protected metrics endpoint. External credentials are not
required for the local emergency runtime and should only be configured if an
operator chooses a monitored deployment.

## Backup and recovery

Every non-replayed snapshot import creates a consistent online SQLite backup
before opening its write transaction. Backup creation fails closed: if staging
or `PRAGMA integrity_check` fails, import does not begin.

Manual backup:

```bash
python3 emergency/scripts/snapshot.py backup
```

Scheduled maintenance (backup followed by retention):

```bash
python3 emergency/scripts/snapshot.py prune \
  --telemetry-days 30 \
  --artifact-days 30 \
  --artifact-keep 14 \
  --backup-days 30
```

The systemd timer runs these commands daily. Operators must also copy at least
one recent backup off the host. A backup on the same disk is not a disaster
recovery copy.

## Incident checks

1. Check `/health/live`; if it fails, inspect the systemd unit and Uvicorn log.
2. Check `/health/ready`; inspect SQLite, disk space, file/artifact storage, backup storage and write permissions.
3. Open `/admin/` and inspect readiness, telemetry and latest errors.
4. Create a manual verified backup before risky changes.
5. Export a non-secret snapshot for routine evidence.
6. For recovery, create a full secret-bearing artifact in protected storage,
   validate it, and import it. Raw secrets are never shown in the panel/API.
7. If restoring an older snapshot, use the explicit older-recovery control and
   record why in the incident log.

## Security baseline

- Production should set `EMERGENCY_DOCS_ENABLED=false` unless docs are needed
  on a private network.
- TLS termination belongs at the reverse proxy.
- `EMERGENCY_TRUSTED_HOSTS` and `EMERGENCY_CORS_ORIGINS` should be explicit.
- Nginx caps request bodies and adds a coarse IP limit; FastAPI also enforces
  configured `Content-Length`, and login has a process-local abuse limiter.
- Security headers include CSP, frame denial, MIME sniffing denial, referrer
  denial, permissions policy and API `no-store` caching.
- Snapshot paths are logical names, never arbitrary filesystem paths.

## Validation before rollout

```bash
python3 -m compileall -q emergency/backend/app emergency/tests emergency/scripts/snapshot.py
python3 -m pytest emergency/tests -q
node --check emergency/frontend/app.js
python3 emergency/scripts/snapshot.py --help
sudo systemd-analyze verify emergency/deploy/genova-emergency.service
sudo nginx -t -c /absolute/path/to/nginx.conf
```

Run service-level smoke tests in a temporary database before starting the
managed production process. Back up the real database before the first rollout.
