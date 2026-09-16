"""FastAPI 应用装配。等价于原 TS app.ts + server.ts。

- CORS（沿用 CORS_ORIGIN 的通配符前缀语义）
- 统一错误封装（AppError / 校验错误 / 未捕获错误）
- 路由挂载，/api/matching 与 /api/ai 套用 AI 限流
- 启动：建表 + 注入演示数据 + 构建向量索引 + 装配服务
- 生产环境可选托管前端静态文件（Docker 部署时由 nginx 承担，此处为单进程运行兜底）
"""
from __future__ import annotations

import json
import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from . import deps
from .config import settings
from .data.ensure_demo_data import ensure_demo_data
from .data.ensure_vector_index import ensure_vector_index
from .db import init_db
from .errors import (
    AppError,
    app_error_handler,
    envelope,
    unhandled_error_handler,
    validation_error_handler,
)
from .routes import ai, analytics, auth, clubs, intents, matching
from .security import ai_rate_limit

logger = logging.getLogger("app")


def _cors_regex() -> str | None:
    patterns = settings.cors_origins
    if not patterns:
        return None
    parts = [re.escape(p).replace(r"\*", ".*") for p in patterns]
    return "^(" + "|".join(parts) + ")$"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seeded = ensure_demo_data(settings.SEED_DEMO_DATA)
    indexed = 0
    try:
        indexed = await ensure_vector_index(enabled=settings.RAG_ENABLED, api_key=settings.AI_API_KEY)
    except Exception as error:  # noqa: BLE001
        logger.error(json.dumps({"event": "vector_index_failed", "message": str(error)}))
    await deps._init()
    logger.info(json.dumps({"event": "server_started", "port": settings.PORT, "seeded": seeded, "indexed": indexed}))
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="CampusMatch AI backend", lifespan=lifespan)

    regex = _cors_regex()
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=regex or "^$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    @app.get("/api/health")
    async def health():
        return envelope({"status": "ok", "message": "Club matching backend is running"})

    app.include_router(clubs.router, prefix="/api/clubs")
    app.include_router(auth.router, prefix="/api/auth")
    app.include_router(intents.router, prefix="/api/intents")
    app.include_router(analytics.router, prefix="/api/analytics")
    app.include_router(matching.router, prefix="/api/matching", dependencies=[Depends(ai_rate_limit)])
    app.include_router(ai.router, prefix="/api/ai", dependencies=[Depends(ai_rate_limit)])

    if settings.is_production:
        frontend_dist = os.path.normpath(
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend", "dist")
        )
        if os.path.isdir(frontend_dist):
            from fastapi.responses import FileResponse
            from fastapi.staticfiles import StaticFiles

            index_file = os.path.join(frontend_dist, "index.html")

            @app.get("/{full_path:path}")
            async def spa_fallback(full_path: str):
                candidate = os.path.join(frontend_dist, full_path)
                if full_path and os.path.isfile(candidate):
                    return FileResponse(candidate)
                return FileResponse(index_file)

            app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    return app


app = create_app()
