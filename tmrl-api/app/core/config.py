from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TMRL_", env_file=".env", env_file_encoding="utf-8")

    app_name: str = "TMRL Hub API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_prefix: str = "/api"
    root_path: str = ""

    database_url: str = "sqlite:////data/tmrl.db"
    api_token: str = "change-me"
    cors_origins: str = "http://localhost:4200,http://127.0.0.1:4200"

    checkpoint_dir: Path = Path("/data/checkpoints")
    memory_dir: Path = Path("/data/memory")
    log_dir: Path = Path("/data/logs")
    metrics_dir: Path = Path("/data/metrics")

    max_checkpoint_upload_mb: int = 2048
    allowed_checkpoint_extensions: str = ".pt,.pth,.ckpt,.zip,.bin,.pkl"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_checkpoint_extension_list(self) -> list[str]:
        return [extension.strip().lower() for extension in self.allowed_checkpoint_extensions.split(",") if extension.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
