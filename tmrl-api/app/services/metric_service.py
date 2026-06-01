from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.metric import MetricRecord
from app.schemas.metric import MetricCreate, MetricOut, MetricPoint, MetricSeries, MetricsResponse


class MetricService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_metrics(self, limit: int = 300) -> MetricsResponse:
        records = list(
            reversed(
                self.db.scalars(select(MetricRecord).order_by(desc(MetricRecord.timestamp)).limit(limit)).all()
            )
        )
        items = [MetricOut.model_validate(record) for record in records]
        session_id = self._latest_session_id(records)

        reward = [self._point(record.timestamp, record.reward) for record in records]
        episode_length = [self._point(record.timestamp, record.episode_length) for record in records]
        actor_loss = [self._point(record.timestamp, record.actor_loss) for record in records]
        critic_loss = [self._point(record.timestamp, record.critic_loss) for record in records]
        memory_length = [self._point(record.timestamp, record.memory_len) for record in records]

        return MetricsResponse(
            items=items,
            total=len(items),
            sessionId=session_id,
            samplingIntervalSeconds=5,
            reward=reward,
            episodeLength=episode_length,
            actorLoss=actor_loss,
            criticLoss=critic_loss,
            memoryLength=memory_length,
            series=[
                MetricSeries(name="reward", unit="reward", points=reward),
                MetricSeries(name="episodeLength", unit="steps", points=episode_length),
                MetricSeries(name="actorLoss", unit="loss", points=actor_loss),
                MetricSeries(name="criticLoss", unit="loss", points=critic_loss),
                MetricSeries(name="memoryLength", unit="transitions", points=memory_length),
            ],
            updatedAt=datetime.now(timezone.utc),
        )

    def create_metric(self, payload: MetricCreate) -> MetricOut:
        record = MetricRecord(
            session_id=payload.session_id,
            timestamp=payload.timestamp or datetime.now(timezone.utc),
            reward=payload.reward,
            episode_length=payload.episode_length,
            actor_loss=payload.actor_loss,
            critic_loss=payload.critic_loss,
            memory_len=payload.memory_len,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return MetricOut.model_validate(record)

    def latest_metric(self) -> Optional[MetricRecord]:
        return self.db.scalars(select(MetricRecord).order_by(desc(MetricRecord.timestamp)).limit(1)).first()

    def best_reward(self) -> float:
        records = self.db.scalars(select(MetricRecord)).all()
        if not records:
            return 0.0
        return max(record.reward for record in records)

    @staticmethod
    def _point(timestamp: datetime, value: float) -> MetricPoint:
        return MetricPoint(timestamp=timestamp, value=float(value))

    @staticmethod
    def _latest_session_id(records: List[MetricRecord]) -> Optional[str]:
        for record in reversed(records):
            if record.session_id:
                return record.session_id
        return None
