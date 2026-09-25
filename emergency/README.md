# Genova Emergency

نسخه اضطراری مستقل ژنوا؛ یک سرویس FastAPI + SQLite که در runtime هیچ وابستگی به Vite، React، Convex، Freebuff یا سایت اصلی ندارد.

## وضعیت فعلی — Phase 10 / Release 0.10.0

- گام‌های ۱ تا ۸: auth، دامنه‌های پایه، Snapshot/recovery، پنل مستقل و production hardening تکمیل شده‌اند.
- گام ۹: بخش‌های `commerce`، `communication` و `files` تکمیل و importer یک‌باره خروجی سایت اصلی اضافه شده است.
- گام ۱۰: bootstrap مدیر، acceptance gate نهایی، backup verification، release manifest و بسته launch تکمیل شده است.
- انتقال یک‌باره کاملاً محلی است: هیچ import یا runtime dependency نسبت به Vite/Convex/سایت اصلی وجود ندارد.
- مرحله نهایی نسخه `0.10.0`: bootstrap مدیر، acceptance gate، backup verification، release manifest و راهنمای launch اضافه شد.
- راهنمای کامل setup و راه‌اندازی: `emergency/docs/setup-and-launch.md`.

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

## تکمیل داده‌ها — Phase 9

داده‌های زیر از خروجی JSON سایت اصلی نگاشت و به‌صورت transaction/idempotent منتقل می‌شوند:

- commerce: محصولات، سفارش‌ها، فروشگاه، coupon، wallet، تراکنش، پرداخت آفلاین/مدرس و subscription
- communication: notification، announcement، inbox، support ticket/message، پیام مستقیم، mentor و comment
- files: file manifest، hash، MIME، size و انتقال payload به file store خصوصی و content-addressed

ابزار یک‌باره:

```bash
python3 emergency/scripts/snapshot.py migrate-main \
  --input ./main-export.json \
  --files-dir ./main-files \
  --dry-run

python3 emergency/scripts/snapshot.py migrate-main \
  --input ./main-export.json \
  --files-dir ./main-files
```

در صورت تفاوت IDها می‌توان `--id-map ./id-map.json` داد. replay همان export بدون write برمی‌گردد؛ `--force-replay` فقط برای اجرای کنترل‌شده مجدد است. guide کامل: `emergency/docs/main-site-migration.md`.

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
python3 emergency/scripts/snapshot.py migrate-main --input ./main-export.json --files-dir ./main-files --dry-run
python3 emergency/scripts/snapshot.py verify-backup <backup-name>.sqlite3
```

برای recovery کامل و کنترل‌شده:

```bash
python3 emergency/scripts/snapshot.py export emergency-recovery --include-secrets
python3 emergency/scripts/snapshot.py import emergency-recovery
```

گزینه `--include-secrets` signing key، token خام، secret runtime و configهای دارای کلید secret را داخل artifact قرار می‌دهد. چنین فایلی باید رمزگذاری و خارج از repository نگهداری شود. rollback عمدی به snapshot قدیمی‌تر نیازمند `--allow-older-recovery` است.

## Final launch gate

```bash
python3 emergency/scripts/bootstrap_admin.py --username admin --email admin@example.com
python3 emergency/scripts/acceptance.py
python3 emergency/scripts/snapshot.py backup
```

Acceptance only uses a temporary database and removes it after success. The
complete installation and launch guide is `emergency/docs/setup-and-launch.md`.

## بررسی

```bash
python3 -m compileall -q emergency/backend/app emergency/tests emergency/scripts/snapshot.py
python3 -m pytest emergency/tests -q
bun tsc -b --noEmit
```

در محیط فعلی، Python service و smoke testها اجرا شده‌اند؛ اما Python system فاقد `pip`، `venv` و `pytest` بوده، بنابراین اجرای واقعی pytest در این مرحله unverified باقی مانده است. `bun tsc` نیز فقط سایت اصلی را typecheck می‌کند و جایگزین تست runtime پایتون نیست.
