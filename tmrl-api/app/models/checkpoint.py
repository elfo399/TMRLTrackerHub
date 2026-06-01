from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CheckpointRecord(Base):
    __tablename__ = "checkpoints"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    reward: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_latest: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
