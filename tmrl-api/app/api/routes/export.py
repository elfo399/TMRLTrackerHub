from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas.export import LatestExportResponse
from app.services.checkpoint_service import CheckpointService

router = APIRouter()


@router.get("/export/latest", response_model=LatestExportResponse)
def export_latest_checkpoint(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> LatestExportResponse:
    service = CheckpointService(db, settings)
    record = service.latest_record()

    if record is None:
        return LatestExportResponse(checkpoint=None, downloadUrl=None, generatedAt=datetime.now(timezone.utc))

    checkpoint = service._to_schema(record)
    download_path = request.url_for("download_checkpoint", checkpoint_id=record.id).path

    return LatestExportResponse(
        checkpoint=checkpoint,
        downloadUrl=download_path,
        generatedAt=datetime.now(timezone.utc),
    )
