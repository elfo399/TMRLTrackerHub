from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas.status import StatusResponse
from app.services.status_service import StatusService

router = APIRouter()


@router.get("/status", response_model=StatusResponse)
def get_status(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StatusResponse:
    started_at = getattr(request.app.state, "started_at", time.time())
    return StatusService(db, settings, started_at).get_status()
