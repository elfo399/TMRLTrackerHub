from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import desc, select, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.checkpoint import CheckpointRecord
from app.schemas.checkpoint import (
    CheckpointActionResponse,
    CheckpointMetadata,
    CheckpointOut,
    CheckpointsResponse,
)

safe_filename_pattern = re.compile(r"[^A-Za-z0-9._-]+")


class CheckpointService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def list_checkpoints(self) -> CheckpointsResponse:
        records = self.db.scalars(select(CheckpointRecord).order_by(desc(CheckpointRecord.created_at))).all()
        latest = next((record.id for record in records if record.is_latest), None)
        return CheckpointsResponse(
            items=[self._to_schema(record) for record in records],
            total=len(records),
            latestCheckpointId=latest,
            updatedAt=datetime.now(timezone.utc),
        )

    async def upload_checkpoint(self, upload: UploadFile, reward: Optional[float]) -> CheckpointOut:
        file_name = self._sanitize_filename(upload.filename or "checkpoint.bin")
        self._validate_extension(file_name)

        checkpoint_id = f"ckpt-{uuid4().hex[:12]}"
        storage_name = f"{checkpoint_id}-{file_name}"
        destination = self.settings.checkpoint_dir / storage_name
        destination.parent.mkdir(parents=True, exist_ok=True)

        max_bytes = self.settings.max_checkpoint_upload_mb * 1024 * 1024
        sha256 = hashlib.sha256()
        size = 0

        try:
            with destination.open("wb") as target:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > max_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail={
                                "code": "CHECKPOINT_TOO_LARGE",
                                "message": f"Checkpoint exceeds {self.settings.max_checkpoint_upload_mb} MB",
                            },
                        )
                    sha256.update(chunk)
                    target.write(chunk)
        except Exception:
            if destination.exists():
                destination.unlink()
            raise
        finally:
            await upload.close()

        record = CheckpointRecord(
            id=checkpoint_id,
            file_name=file_name,
            storage_path=str(destination),
            size_bytes=size,
            reward=reward,
            is_latest=False,
            sha256=sha256.hexdigest(),
            content_type=upload.content_type,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self._to_schema(record)

    def get_record(self, checkpoint_id: str) -> CheckpointRecord:
        record = self.db.get(CheckpointRecord, checkpoint_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CHECKPOINT_NOT_FOUND", "message": "Checkpoint not found", "id": checkpoint_id},
            )
        return record

    def mark_latest(self, checkpoint_id: str) -> CheckpointActionResponse:
        record = self.get_record(checkpoint_id)
        self.db.execute(update(CheckpointRecord).values(is_latest=False))
        record.is_latest = True
        self.db.commit()
        return CheckpointActionResponse(id=checkpoint_id, action="marked-latest", message="Checkpoint marked as latest")

    def delete_checkpoint(self, checkpoint_id: str) -> CheckpointActionResponse:
        record = self.get_record(checkpoint_id)
        path = Path(record.storage_path)
        self.db.delete(record)
        self.db.commit()

        if path.exists():
            path.unlink()

        return CheckpointActionResponse(id=checkpoint_id, action="deleted", message="Checkpoint deleted")

    def latest_record(self) -> Optional[CheckpointRecord]:
        latest = self.db.scalars(select(CheckpointRecord).where(CheckpointRecord.is_latest.is_(True)).limit(1)).first()
        if latest is not None:
            return latest

        return self.db.scalars(select(CheckpointRecord).order_by(desc(CheckpointRecord.created_at)).limit(1)).first()

    def _to_schema(self, record: CheckpointRecord) -> CheckpointOut:
        return CheckpointOut(
            id=record.id,
            fileName=record.file_name,
            createdAt=record.created_at,
            sizeBytes=record.size_bytes,
            reward=record.reward,
            isLatest=record.is_latest,
            storagePath=record.storage_path,
            sha256=record.sha256,
            metadata=CheckpointMetadata(),
        )

    def _sanitize_filename(self, filename: str) -> str:
        name = safe_filename_pattern.sub("_", Path(filename).name).strip("._")
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_FILENAME", "message": "Upload filename is invalid"},
            )
        return name

    def _validate_extension(self, filename: str) -> None:
        extension = Path(filename).suffix.lower()
        allowed_extensions = self.settings.allowed_checkpoint_extension_list
        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_CHECKPOINT_EXTENSION",
                    "message": f"Allowed extensions: {', '.join(allowed_extensions)}",
                },
            )
