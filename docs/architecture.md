# Architecture

## Runtime Topology

```text
External client/browser
        |
        v
Reverse Proxy (Nginx Proxy Manager or Traefik)
        |
        v
tmrl-dashboard (Nginx + Angular SPA)
        |
        | /api/*
        v
tmrl-api (FastAPI + Uvicorn)
        |
        +------------------+
        |                  |
        v                  v
tmrl-db (PostgreSQL)   /data bind mount
                       ├── checkpoints
                       ├── memory
                       ├── metrics
                       └── logs
```

## Services

`tmrl-dashboard`

- Serves the Angular application.
- Provides SPA fallback to `index.html`.
- Proxies `/api/*` to `tmrl-api:8000` inside the Docker network.
- Exposes `/healthz` for container health checks.

`tmrl-api`

- FastAPI REST API under `/api`.
- Receives metrics from the training PC.
- Receives checkpoint uploads from the training PC.
- Stores metadata in PostgreSQL.
- Stores files under `/data`.
- Uses Bearer token authentication for mutating endpoints.

`tmrl-db`

- PostgreSQL metadata store.
- Uses the named Docker volume `postgres_data`.

## Data Flow

```text
Training PC
  ├── POST /api/metrics
  ├── POST /api/checkpoints/upload
  └── POST/PATCH /api/sessions

Dashboard
  ├── GET /api/health
  ├── GET /api/status
  ├── GET /api/metrics
  ├── GET /api/checkpoints
  └── GET /api/sessions
```

## Persistence

Database state:

```text
postgres_data
```

File state:

```text
./data:/data
```

The file mount is intentionally outside the API image so it can be backed up, inspected, or moved between Raspberry/server deployments.
