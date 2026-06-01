from __future__ import annotations

import shutil
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.schemas.status import (
    ReplayMemoryStatus,
    RuntimeServiceStatus,
    StatusResponse,
    StorageUsage,
    TmrlRuntime,
)
from app.services.checkpoint_service import CheckpointService
from app.services.metric_service import MetricService
from app.services.session_service import SessionService


class StatusService:
    def __init__(self, db: Session, settings: Settings, started_at: float) -> None:
        self.db = db
        self.settings = settings
        self.started_at = started_at

    def get_status(self) -> StatusResponse:
        metric_service = MetricService(self.db)
        checkpoint_service = CheckpointService(self.db, self.settings)
        session_service = SessionService(self.db)

        latest_metric = metric_service.latest_metric()
        latest_checkpoint = checkpoint_service.latest_record()
        active_session = session_service.active_session()

        training_active = active_session is not None
        training_started_at = active_session.start_time if active_session else None
        uptime_seconds = self._uptime_seconds(training_started_at)
        current_reward = latest_metric.reward if latest_metric else 0.0
        memory_size = latest_metric.memory_len if latest_metric else 0
        best_reward = max(metric_service.best_reward(), active_session.best_reward if active_session else 0.0)

        now = datetime.now(timezone.utc)
        services = [
            RuntimeServiceStatus(
                name="Server",
                status="online",
                latencyMs=0,
                lastHeartbeat=now,
                detail="FastAPI online",
            ),
            RuntimeServiceStatus(
                name="Trainer",
                status="online" if training_active else "offline",
                latencyMs=0,
                lastHeartbeat=now if training_active else now,
                detail="Active training session" if training_active else "No active session",
            ),
            RuntimeServiceStatus(
                name="Worker",
                status="online" if latest_metric else "offline",
                latencyMs=0,
                lastHeartbeat=latest_metric.timestamp if latest_metric else now,
                detail="Metrics received" if latest_metric else "No metrics yet",
            ),
        ]

        latest_checkpoint_name = latest_checkpoint.file_name if latest_checkpoint else None

        return StatusResponse(
            server_online=True,
            trainer_online=training_active,
            worker_online=latest_metric is not None,
            training_active=training_active,
            latest_checkpoint=latest_checkpoint_name,
            best_reward=best_reward,
            current_reward=current_reward,
            memory_size=memory_size,
            uptime_seconds=uptime_seconds,
            services=services,
            trainingActive=training_active,
            latestCheckpoint=latest_checkpoint_name,
            bestReward=best_reward,
            currentReward=current_reward,
            memorySize=memory_size,
            trainingStartedAt=training_started_at,
            uptimeSeconds=uptime_seconds,
            episodesCompleted=active_session.total_episodes if active_session else 0,
            replayMemory=ReplayMemoryStatus(
                size=memory_size,
                capacity=0,
                warmupComplete=memory_size > 0,
                lastPersistedAt=None,
            ),
            storage=self._storage_usage(),
            runtime=TmrlRuntime(workerCount=1 if latest_metric else 0),
            updatedAt=now,
        )

    def _uptime_seconds(self, training_started_at: Optional[datetime]) -> int:
        if training_started_at is None:
            return int(time.time() - self.started_at)
        started_at = training_started_at if training_started_at.tzinfo else training_started_at.replace(tzinfo=timezone.utc)
        return max(0, int((datetime.now(timezone.utc) - started_at).total_seconds()))

    def _storage_usage(self) -> StorageUsage:
        usage = shutil.disk_usage(self.settings.checkpoint_dir)
        return StorageUsage(
            checkpointsBytes=self._dir_size(self.settings.checkpoint_dir),
            replayMemoryBytes=self._dir_size(self.settings.memory_dir),
            metricsBytes=self._dir_size(self.settings.metrics_dir),
            logsBytes=self._dir_size(self.settings.log_dir),
            freeBytes=usage.free,
        )

    @staticmethod
    def _dir_size(path) -> int:
        total = 0
        if not path.exists():
            return total
        for item in path.rglob("*"):
            if item.is_file():
                total += item.stat().st_size
        return total
