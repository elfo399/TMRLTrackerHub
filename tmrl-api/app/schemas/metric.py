from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class MetricCreate(BaseModel):
    timestamp: Optional[datetime] = None
    session_id: Optional[str] = Field(default=None, max_length=64)
    reward: float = 0.0
    episode_length: int = Field(default=0, ge=0)
    actor_loss: float = 0.0
    critic_loss: float = 0.0
    memory_len: int = Field(default=0, ge=0)


class MetricOut(BaseModel):
    id: int
    timestamp: datetime
    session_id: Optional[str]
    reward: float
    episode_length: int
    actor_loss: float
    critic_loss: float
    memory_len: int

    model_config = ConfigDict(from_attributes=True)


class MetricPoint(BaseModel):
    timestamp: datetime
    value: float
    episode: Optional[int] = None
    step: Optional[int] = None


class MetricSeries(BaseModel):
    name: Literal["reward", "episodeLength", "actorLoss", "criticLoss", "memoryLength"]
    unit: Literal["reward", "steps", "loss", "transitions"]
    points: List[MetricPoint]


class MetricsResponse(BaseModel):
    items: List[MetricOut]
    total: int
    sessionId: Optional[str]
    samplingIntervalSeconds: int
    reward: List[MetricPoint]
    episodeLength: List[MetricPoint]
    actorLoss: List[MetricPoint]
    criticLoss: List[MetricPoint]
    memoryLength: List[MetricPoint]
    series: List[MetricSeries]
    updatedAt: datetime
