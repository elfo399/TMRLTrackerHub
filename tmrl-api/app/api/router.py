from fastapi import APIRouter

from app.api.routes import checkpoints, export, health, metrics, sessions, status

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(status.router, tags=["status"])
api_router.include_router(metrics.router, tags=["metrics"])
api_router.include_router(checkpoints.router, tags=["checkpoints"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(export.router, tags=["export"])
