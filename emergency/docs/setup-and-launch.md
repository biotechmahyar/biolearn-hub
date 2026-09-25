# راهنمای راه‌اندازی Genova Emergency

این راهنما برای نسخه `0.10.0` و کاملاً مستقل از سایت اصلی است.

## ۱. پیش‌نیازها

- Linux server با Python 3.11+
- `python3-venv` و `pip`
- Nginx یا reverse proxy معادل
- systemd برای اجرای permanent
- فضای کافی برای SQLite، backup، artifact و file store

## ۲. نصب isolated runtime

در روش زیر مسیر نمونه `/opt/genova-emergency` است:

```bash
sudo useradd --system --home /opt/genova-emergency --shell /usr/sbin/nologin genova-emergency
sudo mkdir -p /opt/genova-emergency
sudo chown -R genova-emergency:genova-emergency /opt/genova-emergency
sudo -u genova-emergency python3 -m venv /opt/genova-emergency/.venv
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/pip install -r /opt/genova-emergency/backend/requirements.txt
sudo install -d -o genova-emergency -g genova-emergency -m 0700 /opt/genova-emergency/data
sudo install -d -o genova-emergency -g genova-emergency -m 0700 /opt/genova-emergency/data/snapshots
sudo install -d -o genova-emergency -g genova-emergency -m 0700 /opt/genova-emergency/data/backups
sudo install -d -o genova-emergency -g genova-emergency -m 0700 /opt/genova-emergency/data/files
```

پروژه نباید از `src`، Vite یا Convex import کند. تمام runtime از `emergency/` اجرا می‌شود.

## ۳. تنظیمات محیط

```bash
sudo install -d -o root -g genova-emergency -m 0750 /etc/genova-emergency
sudo cp /opt/genova-emergency/deploy/emergency.env.example /etc/genova-emergency/emergency.env
sudo chown root:genova-emergency /etc/genova-emergency/emergency.env
sudo chmod 0600 /etc/genova-emergency/emergency.env
sudoedit /etc/genova-emergency/emergency.env
```

مقادیر مهم:

- `EMERGENCY_DATABASE_PATH`: مسیر SQLite
- `EMERGENCY_ARTIFACT_ROOT`: مسیر Snapshotها
- `EMERGENCY_BACKUP_ROOT`: مسیر backupها
- `EMERGENCY_FILE_ROOT`: مسیر private file payloads
- `EMERGENCY_TRUSTED_HOSTS`: دامنه‌های مجاز
- `EMERGENCY_CORS_ORIGINS`: originهای مجاز
- `EMERGENCY_DOCS_ENABLED=false`: برای production توصیه می‌شود
- `EMERGENCY_MAX_FILE_BYTES`: سقف فایل منتقل‌شده

هیچ secret واقعی را داخل repository یا example commit نکنید.

## ۴. ساخت اولین مدیر

هیچ رمز پیش‌فرضی وجود ندارد. این دستور password را interactively می‌پرسد:

```bash
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/bootstrap_admin.py \
  --username admin \
  --email admin@example.com
```

رمز باید حداقل ۱۲ کاراکتر باشد. برای rotation صریح:

```bash
... bootstrap_admin.py --username admin --email admin@example.com --rotate-existing
```

## ۵. اجرای local smoke پیش از production

این تست temporary database می‌سازد و در صورت موفقیت پاک می‌شود:

```bash
cd /opt/genova-emergency
.venv/bin/python scripts/acceptance.py
```

خروجی باید `"ok": true` باشد.

## ۶. انتقال یک‌باره سایت اصلی

JSON export را از خروجی دریافت‌شده سایت اصلی به مسیر protected منتقل کنید. برای فایل‌ها binary، پوشه‌ای جدا آماده کنید.

Dry run:

```bash
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/snapshot.py migrate-main \
  --input /secure/main-export.json \
  --files-dir /secure/main-files \
  --dry-run
```

بعد از بررسی diagnostics و relationshipها:

```bash
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/snapshot.py migrate-main \
  --input /secure/main-export.json \
  --files-dir /secure/main-files
```

در صورت تفاوت source ID و emergency ID، `--id-map` را اضافه کنید. راهنمای کامل در `docs/main-site-migration.md` است.

## ۷. systemd

فایل‌های reference:

```text
deploy/genova-emergency.service
deploy/genova-emergency-maintenance.service
deploy/genova-emergency-maintenance.timer
```

پس از تنظیم مسیرها و مالکیت‌ها:

```bash
sudo cp deploy/genova-emergency.service /etc/systemd/system/
sudo cp deploy/genova-emergency-maintenance.service /etc/systemd/system/
sudo cp deploy/genova-emergency-maintenance.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now genova-emergency.service
sudo systemctl enable --now genova-emergency-maintenance.timer
```

`ExecStart` عمداً یک worker دارد؛ SQLite و limiter پروسه‌ای با یک writer پایدارتر هستند.

## ۸. Nginx و TLS

`deploy/nginx.conf` شامل upstream، محدودیت body، rate limit، request ID و proxy headers است. certificate و domain را با دامنه واقعی جایگزین کنید.

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/genova-emergency.conf
sudo nginx -t
sudo systemctl reload nginx
```

## ۹. بررسی سلامت

```bash
curl -fsS https://emergency.example.com/health/live
curl -fsS https://emergency.example.com/health/ready
```

- `live`: پروسس بالا است
- `ready`: SQLite، فضای دیسک، artifact، backup و file storage آماده‌اند
- `/admin/`: پنل مستقل مدیریت
- `/docs`: در production باید غیرفعال باشد

## ۱۰. backup و verification

```bash
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/snapshot.py backup

sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/snapshot.py list
```

نام backup خروجی verify:

```bash
sudo -u genova-emergency /opt/genova-emergency/.venv/bin/python \
  /opt/genova-emergency/scripts/snapshot.py verify-backup <backup-name>.sqlite3
```

یک backup باید خارج از همین دیسک هم copy شود. timer روزانه backup و retention را اجرا می‌کند.

## ۱۱. بازیابی اضطراری

1. `/health/ready` و آخرین backup را بررسی کنید.
2. backup را verify کنید.
3. service را در maintenance window متوقف کنید.
4. از backup موجود نسخه دیگری بردارید.
5. Snapshot معتبر را validate کنید.
6. در صورت نیاز به rollback قدیمی، گزینه explicit recovery را فقط بعد از تأیید incident استفاده کنید.
7. پس از import، acceptance را روی یک clone اجرا کنید و سپس readiness/backup را بررسی کنید.

```bash
python3 emergency/scripts/snapshot.py validate <artifact-name>
python3 emergency/scripts/snapshot.py import <artifact-name>
```

## ۱۲. پایان چرخه

پس از launch:

- `/health/ready` را monitor کنید.
- backup روزانه را verify و off-host نگهداری کنید.
- migrationهای بعدی را فقط از export جدید و با `--dry-run` شروع کنید.
- `emergency/RELEASE.md` و runbook را به‌عنوان نسخه مرجع نگه دارید.
- هیچ تغییری در سایت اصلی برای runtime emergency لازم نیست.
