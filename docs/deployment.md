# Deployment

## Prerequisites

- Linux server or Raspberry Pi ARM64.
- Docker Engine.
- Docker Compose plugin.
- Existing reverse proxy such as Nginx Proxy Manager or Traefik.

## First Deploy

```bash
git clone <repo-url> TMRLTrackerHub
cd TMRLTrackerHub
cp .env.example .env
```

Edit `.env`:

```text
API_TOKEN=<strong-token>
POSTGRES_PASSWORD=<strong-password>
DASHBOARD_PORT=8080
API_PORT=8000
CORS_ORIGINS=https://your-domain.example
```

Create persistent directories:

```bash
mkdir -p data/checkpoints data/memory data/metrics data/logs
```

Start:

```bash
docker compose up -d --build
```

Check health:

```bash
docker compose ps
curl http://localhost:8000/api/health
curl http://localhost:8080/healthz
```

## Reverse Proxy

Recommended setup:

```text
https://your-domain.example -> http://server-ip:DASHBOARD_PORT
```

The dashboard container handles `/api` proxying internally:

```text
/api/* -> tmrl-api:8000
```

Alternative setup:

```text
https://your-domain.example/      -> tmrl-dashboard:80
https://your-domain.example/api/* -> tmrl-api:8000
```

Keep the public API path as `/api` because the frontend production environment uses a relative `/api` URL.

## Updates

```bash
git pull
docker compose up -d --build
docker image prune
```

## Backup

Files:

```bash
tar -czf tmrl-data-$(date +%F).tgz data
```

PostgreSQL:

```bash
docker compose exec tmrl-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > postgres-$(date +%F).sql
```

## Restore

Files:

```bash
tar -xzf tmrl-data-YYYY-MM-DD.tgz
```

PostgreSQL:

```bash
cat postgres-YYYY-MM-DD.sql | docker compose exec -T tmrl-db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Storage Paths

Inside containers:

```text
/data/checkpoints
/data/memory
/data/metrics
/data/logs
```

On host:

```text
./data/checkpoints
./data/memory
./data/metrics
./data/logs
```
