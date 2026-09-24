# Emergency Backend

This is the independent Python API for the Genova emergency site.

## Commands

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoints

- `GET /` — service identity
- `GET /health` — service and SQLite readiness

## Configuration

The service reads these environment variables:

- `EMERGENCY_ENV`
- `EMERGENCY_HOST`
- `EMERGENCY_PORT`
- `EMERGENCY_DATABASE_PATH`
- `EMERGENCY_CORS_ORIGINS`

No environment file is required for local development.
