# Genova Emergency

نسخه اضطراری مستقل ژنوا؛ یک سرویس FastAPI + SQLite که در runtime هیچ وابستگی به Vite، React، Convex، Freebuff یا سایت اصلی ندارد.

## وضعیت فعلی — Phase 8

- گام‌های ۱ تا ۷: auth، دامنه‌های ژنوا، Snapshot v1، recovery tooling و پنل مستقل تکمیل شده‌اند.
- گام ۸: readiness/live health، telemetry کم‌کاردینالی و privacy-safe، rate limiting، backup پیش از import، retention، deployment reference و runbook production تکمیل شده است.
- استقرار واقعی، TLS و انتخاب collector خارجی همچنان عملیات deployment هستند و credential یا دسترسی سرور لازم دارند.

## اجرای مستقل

```bash
python3 -m venv emergency/.venv
source emergency/.venv/bin/activate
pip install -r emergency/backend/requirements.txt
uvicorn app.main:app --app-dir emergency/backend --host 127.0.0.1 --port 8000
```

- API docs: `http://127.0.0.1:8000/docs`
- Emergency admin: `http://127.0.0.1:8000/admin/`
- Health: `http://127.0.0.1:8000/health`

مسیر پیش‌فرض داده‌ها `./data/emergency.sqlite3` و artifactها `./data/snapshots` است. با `EMERGENCY_DATABASE_PATH` و `EMERGENCY_ARTIFACT_ROOT` قابل تغییرند.

## Snapshot artifact

هر artifact یک directory محدود و private است:

```text
backup-name/
├── manifest.json   # قرارداد، countها، checksum و policy
└── data.json       # ۱۸ section، diagnostics و recordها
```

امکانات گام ۷:

- export تمام tableهای پیاده‌سازی‌شده با حفظ source ID و timestamp
- validation نسخه، بخش‌ها، countها، IDهای تکراری و SHA-256
- import به ترتیب dependency، داخل یک transaction
- preflight تمام foreign keyهای artifact پیش از هر write
- idempotency: import مجدد همان snapshot بدون write و با `replayed: true`
- version ordering: نسخه قدیمی‌تر فقط با recovery flag صریح پذیرفته می‌شود
- ثبت import/export در `emergency_audit_events`
- redaction: secretها در API/UI نمایش داده نمی‌شوند؛ artifact امن secret خام ندارد

تمام نام‌های artifact به نام directory بدون `/`، `..`، symlink و character set محدود نیاز دارند و هر فایل حداکثر 100 MiB است.

## Production hardening

- health: `/health/live`, `/health/ready` و `/health`
- auth login limiter، trusted hosts، request body limit و security headers
- SQLite request aggregates و error fingerprints بدون ذخیره body، query، IP، header یا پیام exception
- metrics به فرمت Prometheus، فقط با Bearer admin
- backup سازگار SQLite با `PRAGMA integrity_check` پیش از هر import واقعی
- retention روزانه برای telemetry، artifact و backup
- systemd، timer، Nginx و environment template نمونه در `emergency/deploy/`
- راهنمای اجرا و incident response: `emergency/docs/production-runbook.md`

## CLI

```bash
python3 emergency/scripts/snapshot.py list
python3 emergency/scripts/snapshot.py export backup-2026-09-24
python3 emergency/scripts/snapshot.py validate backup-2026-09-24
python3 emergency/scripts/snapshot.py import backup-2026-09-24
python3 emergency/scripts/snapshot.py backup
python3 emergency/scripts/snapshot.py prune
```

برای recovery کامل و کنترل‌شده:

```bash
python3 emergency/scripts/snapshot.py export emergency-recovery --include-secrets
python3 emergency/scripts/snapshot.py import emergency-recovery
```

گزینه `--include-secrets` signing key، token خام، secret runtime و configهای دارای کلید secret را داخل artifact قرار می‌دهد. چنین فایلی باید رمزگذاری و خارج از repository نگهداری شود. rollback عمدی به snapshot قدیمی‌تر نیازمند `--allow-older-recovery` است.

## بررسی

```bash
python3 -m compileall -q emergency/backend/app emergency/tests emergency/scripts/snapshot.py
python3 -m pytest emergency/tests -q
bun tsc -b --noEmit
```

در محیط فعلی، Python service و smoke testها اجرا شده‌اند؛ اما Python system فاقد `pip`، `venv` و `pytest` بوده، بنابراین اجرای واقعی pytest در این مرحله unverified باقی مانده است. `bun tsc` نیز فقط سایت اصلی را typecheck می‌کند و جایگزین تست runtime پایتون نیست.
