from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.checkpoint import CheckpointOut


class LatestExportResponse(BaseModel):
    checkpoint: Optional[CheckpointOut]
    downloadUrl: Optional[str]
    generatedAt: datetime
