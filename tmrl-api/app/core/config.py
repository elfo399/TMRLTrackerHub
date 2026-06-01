from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
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
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:4200", "http://127.0.0.1:4200"])

    checkpoint_dir: Path = Path("/data/checkpoints")
    memory_dir: Path = Path("/data/memory")
    log_dir: Path = Path("/data/logs")
    metrics_dir: Path = Path("/data/metrics")

    max_checkpoint_upload_mb: int = 2048
    allowed_checkpoint_extensions: List[str] = Field(default_factory=lambda: [".pt", ".pth", ".ckpt", ".zip", ".bin", ".pkl"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("allowed_checkpoint_extensions", mode="before")
    @classmethod
    def parse_extensions(cls, value: object) -> object:
        if isinstance(value, str):
            return [extension.strip().lower() for extension in value.split(",") if extension.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
