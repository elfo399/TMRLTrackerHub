from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import require_api_token
from app.schemas.checkpoint import CheckpointActionResponse, CheckpointOut, CheckpointsResponse
from app.services.checkpoint_service import CheckpointService

router = APIRouter()


@router.get("/checkpoints", response_model=CheckpointsResponse)
def list_checkpoints(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CheckpointsResponse:
    return CheckpointService(db, settings).list_checkpoints()


@router.post(
    "/checkpoints/upload",
    response_model=CheckpointOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_api_token)],
)
async def upload_checkpoint(
    file: UploadFile = File(...),
    reward: Optional[float] = Form(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CheckpointOut:
    return await CheckpointService(db, settings).upload_checkpoint(file, reward)


@router.get("/checkpoints/{checkpoint_id}/download")
def download_checkpoint(
    checkpoint_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> FileResponse:
    record = CheckpointService(db, settings).get_record(checkpoint_id)
    path = Path(record.storage_path)

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHECKPOINT_FILE_MISSING", "message": "Checkpoint metadata exists but file is missing"},
        )

    return FileResponse(path, media_type=record.content_type or "application/octet-stream", filename=record.file_name)


@router.post(
    "/checkpoints/{checkpoint_id}/latest",
    response_model=CheckpointActionResponse,
    dependencies=[Depends(require_api_token)],
)
def mark_checkpoint_latest(
    checkpoint_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CheckpointActionResponse:
    return CheckpointService(db, settings).mark_latest(checkpoint_id)


@router.delete(
    "/checkpoints/{checkpoint_id}",
    response_model=CheckpointActionResponse,
    dependencies=[Depends(require_api_token)],
)
def delete_checkpoint(
    checkpoint_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CheckpointActionResponse:
    return CheckpointService(db, settings).delete_checkpoint(checkpoint_id)
