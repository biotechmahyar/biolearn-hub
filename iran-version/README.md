# Genova Iran Mirror

Read-only mirror of the Genova biological sciences platform, designed for
availability when international internet connectivity is disrupted.

## Architecture

```
Main Site (Convex) ─── sync/data ──→ Iran Mirror (FastAPI + SQLite/PostgreSQL)
                                          │
                                    every 30 min
                                          │
                                    React Frontend
```

### How it works

1. **Normal mode**: The Iran site mirrors the main site's public data, syncing every 30 minutes
2. **Offline mode**: When the main site is unreachable, the Iran site continues serving cached data
3. **Offline writes**: Users can register, enroll, and purchase locally when offline
4. **Reconnection**: Offline changes are queued and synced back to the main site when connectivity returns

## Project Structure

```
iran-version/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── models/
│   │   │   └── database.py      # SQLAlchemy models
│   │   ├── routes/
│   │   │   ├── content.py       # Public content API
│   │   │   └── sync.py          # Sync management
│   │   └── services/
│   │       └── sync_service.py  # Sync worker logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/                     # React frontend (to be added)
└── README.md
```

## Setup

### Backend

```bash
cd iran-version/backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAIN_SITE_URL` | `https://genova.nibrc.ir` | Main site URL |
| `SYNC_API_KEY` | `changeme-sync-secret-key` | Must match main site |
| `SYNC_INTERVAL` | `1800` | Sync interval (seconds) |
| `DATABASE_URL` | `sqlite:///./iran_mirror.db` | Database connection |
| `SYNC_TIMEOUT` | `60` | HTTP timeout (seconds) |

## API Endpoints

### Content (read-only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/content/categories` | List categories |
| GET | `/api/content/courses` | List courses |
| GET | `/api/content/courses/:slug` | Course detail |
| GET | `/api/content/instructors` | List instructors |
| GET | `/api/content/instructors/:slug` | Instructor detail |
| GET | `/api/content/products` | List products |
| GET | `/api/content/products/:slug` | Product detail |
| GET | `/api/content/workshops` | List workshops |
| GET | `/api/content/workshops/:slug` | Workshop detail |
| GET | `/api/content/articles` | List articles |
| GET | `/api/content/articles/:slug` | Article detail |
| GET | `/api/content/dictionary` | Search dictionary |
| GET | `/api/content/exams` | List exams |
| GET | `/api/content/daily-quiz` | Today's quiz |
| GET | `/api/content/testimonials` | Testimonials |

### Sync Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync/trigger` | Trigger manual sync |
| GET | `/api/sync/status` | View sync history |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root info |
| GET | `/health` | Health check |

## Main Site Changes

A single sync endpoint was added to the main Convex site:

- **File**: `src/convex/syncData.ts`
- **Route**: `GET /sync/data`
- **Auth**: `X-Sync-Key` header
- **Returns**: All public data as JSON

## Deployment (Iran VPS)

### Recommended: Docker

```bash
docker-compose up -d
```

### Manual

```bash
# Install Python 3.11+
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export MAIN_SITE_URL=https://genova.nibrc.ir
export SYNC_API_KEY=your-key
export DATABASE_URL=postgresql://user:pass@localhost/genova_mirror

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name iran.genova.ir;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
