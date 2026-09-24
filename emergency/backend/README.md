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
- `POST /api/auth/login` — authenticate an imported or local password account
- `GET /api/auth/me` — resolve the current Bearer user and role
- `POST /api/auth/refresh` — rotate an opaque or imported refresh token
- `POST /api/auth/logout` — idempotently revoke an access token

The login and refresh responses contain an emergency-local opaque access/refresh
pair. The service keeps the raw token value in the local session/token tables
for snapshot compatibility and also stores SHA-256 lookup hashes.

## Auth import

The versioned data contract is defined in `app/snapshot_contract.py` and
documented in `../docs/snapshot-contract.md`. During import, feed the
`identity`, `auth_accounts`, `auth_sessions`, `auth_tokens`, and `auth_secrets`
records to `AuthService.upsert_user`, `upsert_password_account`,
`upsert_session`, `upsert_token`, and `upsert_signing_key` respectively. These
methods are idempotent by source record ID. The operational exporter/importer
is a later phase; no import from the main Convex application is performed here.

Supported portable password algorithms are `pbkdf2_sha256`, `scrypt`,
`sha256`, and `portable`; `plaintext` is accepted only for explicitly marked
legacy records. `bcrypt` and Argon2 are supported when the corresponding
runtime dependency is installed. JWT access tokens are verified against an
imported signing key, including `kid`, algorithm, issuer, audience, expiry,
and subject checks. PyJWT is installed by default; missing optional hash
runtimes produce an explicit unsupported-algorithm error rather than silently
accepting a credential.

## Configuration

The service reads these environment variables:

- `EMERGENCY_ENV`
- `EMERGENCY_HOST`
- `EMERGENCY_PORT`
- `EMERGENCY_DATABASE_PATH`
- `EMERGENCY_CORS_ORIGINS`

No environment file is required for local development.
