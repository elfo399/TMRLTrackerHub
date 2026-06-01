# tmrl-api

FastAPI backend for TMRLTrackerHub.

Use this folder for backend development only. Production orchestration is managed by the root `docker-compose.yml`.

## Local Development

Use Python 3.11+.

```bash
cd tmrl-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run against the root `data/` folder:

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

Docs:

```text
http://localhost:8000/api/docs
```

The full deployment guide and endpoint contract are in the root `README.md` and `docs/`.
