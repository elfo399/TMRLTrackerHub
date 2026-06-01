# TMRLTrackerHub

TMRLTrackerHub is a Docker-ready monitoring hub for Trackmania/TMRL reinforcement learning runs.

It contains:

- `tmrl-dashboard`: Angular frontend served by Nginx.
- `tmrl-api`: FastAPI backend for status, metrics, checkpoints, sessions, and file transfer.
- `tmrl-db`: PostgreSQL service defined in the root Docker Compose file.
- `data`: persistent host-mounted storage for checkpoints, replay memory, metrics, and logs.

## Repository Layout

```text
TMRLTRACKERHUB/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
├── data/
│   ├── checkpoints/
│   ├── memory/
│   ├── metrics/
│   └── logs/
├── docs/
│   ├── architecture.md
│   ├── backend-integration.md
│   └── deployment.md
├── tmrl-api/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── app/
│   └── scripts/
└── tmrl-dashboard/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf
    ├── package.json
    ├── angular.json
    └── src/
```

## Configuration

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Required values:

```text
API_TOKEN=change-me
POSTGRES_DB=tmrl
POSTGRES_USER=tmrl
POSTGRES_PASSWORD=change-me
API_PORT=8000
DASHBOARD_PORT=8080
CORS_ORIGINS=http://localhost:4200,http://localhost:8080
```

Use a strong `API_TOKEN` and `POSTGRES_PASSWORD` outside local development.

## Frontend Development

```bash
cd tmrl-dashboard
npm install
npm start
```

The Angular app calls the live API configured in Settings:

```text
API URL: /api
```

Production build:

```bash
cd tmrl-dashboard
npm run build:prod
```

## Backend Development

Use Python 3.11+.

```bash
cd tmrl-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

For local development without Docker, point storage to the root `data` folder:

```bash
export TMRL_DATABASE_URL=sqlite:///../data/tmrl.db
export TMRL_CHECKPOINT_DIR=../data/checkpoints
export TMRL_MEMORY_DIR=../data/memory
export TMRL_METRICS_DIR=../data/metrics
export TMRL_LOG_DIR=../data/logs
export TMRL_API_TOKEN=change-me
export TMRL_CORS_ORIGINS=http://localhost:4200,http://localhost:8080
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

## Docker Compose

Build and start the full stack:

```bash
docker compose up -d --build
```

Default ports:

```text
Dashboard: http://localhost:8080
API:       http://localhost:8000/api
```

Stop:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f tmrl-api
docker compose logs -f tmrl-dashboard
```

## Raspberry/Linux Deploy

On the server:

```bash
git clone <repo-url> TMRLTrackerHub
cd TMRLTrackerHub
cp .env.example .env
mkdir -p data/checkpoints data/memory data/metrics data/logs
docker compose up -d --build
```

The compose file uses multi-arch base images suitable for ARM64:

- `python:3.11-slim`
- `node:22-alpine`
- `nginx:1.27-alpine`
- `postgres:16-alpine`

If your Linux user owns the repository, the bind-mounted `./data:/data` directory remains easy to back up and inspect.

## Reverse Proxy

Recommended public route:

```text
https://your-domain.example -> tmrl-dashboard:80
```

The dashboard Nginx serves the Angular SPA and proxies:

```text
/api/* -> http://tmrl-api:8000/api/*
```

If your external reverse proxy routes API separately, keep the same public `/api` path so the frontend can use relative API URLs.

## Backup

Back up persistent data:

```bash
tar -czf tmrl-data-backup.tgz data
docker compose exec tmrl-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > postgres-backup.sql
```

Restore files:

```bash
tar -xzf tmrl-data-backup.tgz
```

Restore PostgreSQL:

```bash
cat postgres-backup.sql | docker compose exec -T tmrl-db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Useful Endpoints

```text
GET    /api/health
GET    /api/status
GET    /api/metrics
POST   /api/metrics
GET    /api/checkpoints
POST   /api/checkpoints/upload
GET    /api/checkpoints/{id}/download
POST   /api/checkpoints/{id}/latest
DELETE /api/checkpoints/{id}
GET    /api/sessions
POST   /api/sessions
PATCH  /api/sessions/{id}
GET    /api/export/latest
```

Protected write endpoints require:

```http
Authorization: Bearer <API_TOKEN>
```
