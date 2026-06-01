from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas.health import DependencyHealth, HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    now = datetime.now(timezone.utc)
    dependencies = []
    overall_status = "ok"

    try:
        db.execute(text("select 1"))
        dependencies.append(
            DependencyHealth(
                name="database",
                status="ok",
                latencyMs=0,
                message="Database reachable",
                checkedAt=now,
            )
        )
    except Exception:
        overall_status = "degraded"
        dependencies.append(
            DependencyHealth(
                name="database",
                status="down",
                message="Database query failed",
                checkedAt=now,
            )
        )

    storage_ok = all(
        path.exists() and path.is_dir()
        for path in [settings.checkpoint_dir, settings.memory_dir, settings.log_dir, settings.metrics_dir]
    )
    if not storage_ok:
        overall_status = "degraded"

    dependencies.append(
        DependencyHealth(
            name="storage",
            status="ok" if storage_ok else "degraded",
            latencyMs=0,
            message="Storage directories ready" if storage_ok else "One or more storage directories are missing",
            checkedAt=now,
        )
    )

    started_at = getattr(request.app.state, "started_at", time.time())

    return HealthResponse(
        status=overall_status,
        service="tmrl-api",
        version=settings.app_version,
        environment=settings.environment,
        uptimeSeconds=int(time.time() - started_at),
        dependencies=dependencies,
        timestamp=now,
    )
