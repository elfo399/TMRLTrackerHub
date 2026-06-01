from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MetricRecord(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    reward: Mapped[float] = mapped_column(Float, default=0.0)
    episode_length: Mapped[int] = mapped_column(Integer, default=0)
    actor_loss: Mapped[float] = mapped_column(Float, default=0.0)
    critic_loss: Mapped[float] = mapped_column(Float, default=0.0)
    memory_len: Mapped[int] = mapped_column(Integer, default=0)
