from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_api_token
from app.schemas.metric import MetricCreate, MetricOut, MetricsResponse
from app.services.metric_service import MetricService

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
def list_metrics(
    limit: int = Query(default=300, ge=1, le=5000),
    db: Session = Depends(get_db),
) -> MetricsResponse:
    return MetricService(db).list_metrics(limit=limit)


@router.post("/metrics", response_model=MetricOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_token)])
def create_metric(payload: MetricCreate, db: Session = Depends(get_db)) -> MetricOut:
    return MetricService(db).create_metric(payload)
