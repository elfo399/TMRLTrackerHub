from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SessionStatus = Literal["running", "completed", "failed", "stopped"]


class TrainingSessionCreate(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64)
    start_time: Optional[datetime] = None
    notes: str = ""


class TrainingSessionPatch(BaseModel):
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    best_reward: Optional[float] = None
    status: Optional[SessionStatus] = None
    total_episodes: Optional[int] = Field(default=None, ge=0)
    average_reward: Optional[float] = None
    checkpoint_count: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None


class TrainingSessionOut(BaseModel):
    id: str
    startTime: datetime
    endTime: Optional[datetime]
    durationSeconds: int
    bestReward: float
    status: SessionStatus
    totalEpisodes: int
    averageReward: float
    checkpointCount: int
    algorithm: str = "SAC"
    trackName: str = "unknown"
    device: str = "cpu"
    notes: str

    model_config = ConfigDict(from_attributes=True)


class SessionsResponse(BaseModel):
    items: List[TrainingSessionOut]
    total: int
    activeSessionId: Optional[str]
    updatedAt: datetime
