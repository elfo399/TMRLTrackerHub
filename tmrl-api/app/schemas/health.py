from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict

HealthStatus = Literal["ok", "degraded", "down"]


class DependencyHealth(BaseModel):
    name: str
    status: HealthStatus
    latencyMs: Optional[int] = None
    message: str
    checkedAt: datetime


class HealthResponse(BaseModel):
    status: HealthStatus
    service: Literal["tmrl-api"]
    version: str
    environment: str
    uptimeSeconds: int
    dependencies: List[DependencyHealth]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
