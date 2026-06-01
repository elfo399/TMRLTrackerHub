from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class RuntimeServiceStatus(BaseModel):
    name: str
    status: Literal["online", "degraded", "offline"]
    latencyMs: int
    lastHeartbeat: datetime
    detail: str


class ReplayMemoryStatus(BaseModel):
    size: int
    capacity: int
    warmupComplete: bool
    lastPersistedAt: Optional[datetime] = None


class StorageUsage(BaseModel):
    checkpointsBytes: int
    replayMemoryBytes: int
    metricsBytes: int
    logsBytes: int
    freeBytes: int


class TmrlRuntime(BaseModel):
    trackName: str = "unknown"
    algorithm: str = "SAC"
    device: str = "cpu"
    workerCount: int = 0
    tmrlVersion: str = "unknown"


class StatusResponse(BaseModel):
    server_online: bool
    trainer_online: bool
    worker_online: bool
    training_active: bool
    latest_checkpoint: Optional[str]
    best_reward: float
    current_reward: float
    memory_size: int
    uptime_seconds: int

    services: List[RuntimeServiceStatus]
    trainingActive: bool
    latestCheckpoint: Optional[str]
    bestReward: float
    currentReward: float
    memorySize: int
    trainingStartedAt: Optional[datetime]
    uptimeSeconds: int
    episodesCompleted: int
    replayMemory: ReplayMemoryStatus
    storage: StorageUsage
    runtime: TmrlRuntime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)
