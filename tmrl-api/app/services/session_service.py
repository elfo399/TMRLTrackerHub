from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.session import TrainingSessionRecord
from app.schemas.session import SessionsResponse, TrainingSessionCreate, TrainingSessionOut, TrainingSessionPatch


class SessionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_sessions(self) -> SessionsResponse:
        records = self.db.scalars(select(TrainingSessionRecord).order_by(desc(TrainingSessionRecord.start_time))).all()
        items = [self._to_schema(record) for record in records]
        active_session_id = next((item.id for item in items if item.status == "running"), None)

        return SessionsResponse(
            items=items,
            total=len(items),
            activeSessionId=active_session_id,
            updatedAt=datetime.now(timezone.utc),
        )

    def create_session(self, payload: TrainingSessionCreate) -> TrainingSessionOut:
        record = TrainingSessionRecord(
            id=payload.id or f"session-{uuid4().hex[:12]}",
            start_time=payload.start_time or datetime.now(timezone.utc),
            notes=payload.notes,
            status="running",
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self._to_schema(record)

    def update_session(self, session_id: str, payload: TrainingSessionPatch) -> TrainingSessionOut:
        record = self.get_record(session_id)
        update = payload.model_dump(exclude_unset=True)

        for field, value in update.items():
            setattr(record, field, value)

        if record.end_time and not payload.duration_seconds:
            start_time = record.start_time if record.start_time.tzinfo else record.start_time.replace(tzinfo=timezone.utc)
            end_time = record.end_time if record.end_time.tzinfo else record.end_time.replace(tzinfo=timezone.utc)
            record.duration_seconds = max(0, int((end_time - start_time).total_seconds()))

        self.db.commit()
        self.db.refresh(record)
        return self._to_schema(record)

    def active_session(self) -> Optional[TrainingSessionRecord]:
        return self.db.scalars(
            select(TrainingSessionRecord)
            .where(TrainingSessionRecord.status == "running")
            .order_by(desc(TrainingSessionRecord.start_time))
            .limit(1)
        ).first()

    def get_record(self, session_id: str) -> TrainingSessionRecord:
        record = self.db.get(TrainingSessionRecord, session_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "SESSION_NOT_FOUND", "message": "Training session not found", "id": session_id},
            )
        return record

    @staticmethod
    def _to_schema(record: TrainingSessionRecord) -> TrainingSessionOut:
        duration = record.duration_seconds
        if record.status == "running" and record.end_time is None:
            start_time = record.start_time if record.start_time.tzinfo else record.start_time.replace(tzinfo=timezone.utc)
            duration = max(0, int((datetime.now(timezone.utc) - start_time).total_seconds()))

        return TrainingSessionOut(
            id=record.id,
            startTime=record.start_time,
            endTime=record.end_time,
            durationSeconds=duration,
            bestReward=record.best_reward,
            status=record.status,
            totalEpisodes=record.total_episodes,
            averageReward=record.average_reward,
            checkpointCount=record.checkpoint_count,
            notes=record.notes,
        )
