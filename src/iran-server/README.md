# NIBRC Iran Backend Server

Backup/offline backend for NIBRC Academy using Hono + PostgreSQL + Drizzle ORM.

## Features

- **JWT Authentication** — Register, login, refresh, profile
- **Content API** — Courses, articles, products, workshops, dictionary, exams
- **Marketplace** — Products, cart, wishlist, reviews, seller panel
- **Wallet** — Digital wallet, transactions
- **AI Chat** — Conversation management with internal AI provider support
- **Class Management** — Request and manage online classes
- **Auto-Sync** — Syncs data from main NIBRC site every 30 minutes

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Generate and run migrations
npm run db:generate
npm run db:migrate

# Or push schema directly
npm run db:push

# Start development server
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://localhost:5432/nibrc` |
| MAIN_SITE_URL | Main NIBRC site for sync | `https://nibrc.ir` |
| JWT_SECRET | Secret for JWT tokens | Dev default |
| PORT | Server port | `3000` |

## API Endpoints

### Public
- `GET /health` — Health check
- `GET /api/content/courses` — List courses
- `GET /api/content/courses/:slug` — Course detail
- `GET /api/content/articles` — List articles
- `GET /api/content/dictionary` — Search dictionary
- `GET /api/content/exams` — List exams
- `GET /api/content/products` — List products
- `GET /api/content/workshops` — List workshops
- `GET /api/content/instructors` — List instructors

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Current user (authenticated)

### Marketplace
- `GET /api/marketplace/products` — Browse products
- `POST /api/marketplace/cart` — Add to cart
- `GET /api/marketplace/cart` — View cart
- `POST /api/marketplace/wishlist` — Toggle wishlist

### AI
- `GET /api/ai/models` — List AI models
- `POST /api/ai/chat` — Chat with AI
- `GET /api/ai/conversations` — List conversations

### Sync
- Automatic sync every 30 minutes
- `npm run sync` — Manual sync

## Architecture

```
NIBRC Main (Convex)  ←──sync──→  Iran Server (PostgreSQL)
        ↕                                ↕
  Global Frontend              Same Frontend (Iran Mode)
```

The Iran server provides the same API shape as the main Convex backend, enabling the frontend to seamlessly switch between global and local modes.
