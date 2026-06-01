from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import init_db
from app.core.logging import configure_logging, logger

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.started_at = time.time()
    for path in [settings.checkpoint_dir, settings.memory_dir, settings.log_dir, settings.metrics_dir]:
        path.mkdir(parents=True, exist_ok=True)
    init_db()
    logger.info("TMRL API started")
    yield
    logger.info("TMRL API stopped")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    root_path=settings.root_path,
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error for %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Unexpected server error",
        },
    )
