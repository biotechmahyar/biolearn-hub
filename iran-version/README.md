# NIBRC Iran Version

نسخه مستقل و مخصوص زیرساخت ایران از پلتفرم آموزشی Genova (NIBRC).

## معماری

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React+Vite  │     │ Hono+Node.js │     │              │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────┴───────┐
                    │   Socket.IO  │
                    │  (Realtime)  │
                    └──────────────┘
                           │
                    ┌──────┴───────┐
                    │  MinIO/S3    │
                    │  (Storage)   │
                    └──────────────┘
```

## شروع سریع

```bash
# کپی کردن env
cp .env.example .env

# اجرای Docker Compose
docker compose up -d

# ساخت اولین ادمین
docker compose exec backend npx tsx src/scripts/seed-admin.ts
```

## سرویس‌ها

| سرویس | پورت | توضیح |
|-------|------|-------|
| Frontend | 5173 | React + Vite Dev Server |
| Backend | 3000 | Hono API Server |
| PostgreSQL | 5432 | دیتابیس اصلی |
| MinIO | 9000 | ذخیره فایل و تصاویر |

## ساختار پروژه

```
iran-version/
├── backend/          — Node.js + Hono + TypeScript
├── frontend/         — React + Vite + TypeScript
├── shared/           — Types مشترک
├── docker-compose.yml
├── .env.example
└── README.md
```
