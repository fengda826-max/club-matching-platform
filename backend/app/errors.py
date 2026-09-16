"""统一错误处理与响应封装。对外 JSON 形状与原 TS 版本逐字一致：
成功 {"success": true, "data": ...}
失败 {"success": false, "error": CODE, "message": "...", "details"?: ...}
"""
from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def envelope(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"success": False, "error": code, "message": message}
    if details is not None:
        body["details"] = details
    return body


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content=_error_body(exc.code, exc.message, exc.details))


async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"path": ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")),
         "message": err.get("msg", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content=_error_body("VALIDATION_ERROR", "请求参数不合法", details),
    )


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    import logging

    logging.getLogger("app").exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content=_error_body("INTERNAL_ERROR", "服务暂时不可用"))
