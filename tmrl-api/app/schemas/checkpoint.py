from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class CheckpointMetadata(BaseModel):
    algorithm: str = "SAC"
    trackName: str = "unknown"
    episode: int = 0
    step: int = 0
    gitCommit: Optional[str] = None


class CheckpointOut(BaseModel):
    id: str
    fileName: str
    createdAt: datetime
    sizeBytes: int
    reward: Optional[float]
    isLatest: bool
    storagePath: str
    sha256: str
    metadata: CheckpointMetadata

    model_config = ConfigDict(from_attributes=True)


class CheckpointsResponse(BaseModel):
    items: List[CheckpointOut]
    total: int
    latestCheckpointId: Optional[str]
    updatedAt: datetime


class CheckpointActionResponse(BaseModel):
    id: str
    action: Literal["downloaded", "marked-latest", "deleted"]
    message: str
