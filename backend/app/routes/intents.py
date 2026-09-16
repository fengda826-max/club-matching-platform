"""招新意向路由。等价于原 TS routes/intents.ts。匿名、按会话去重。"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..config import settings
from ..deps import intent_service
from ..errors import AppError, envelope
from ..schemas import IntentRequest
from ..security import SESSION_COOKIE

router = APIRouter()

_SESSION_MAX_AGE = 30 * 24 * 60 * 60  # 秒


@router.post("")
async def record_intent(payload: IntentRequest, request: Request):
    existing = request.cookies.get(SESSION_COOKIE)
    session_id = existing or str(uuid.uuid4())
    result = intent_service.record(
        club_id=payload.club_id, source=payload.source,
        session_id=session_id, match_score=payload.match_score,
    )
    if result.get("reason") == "CLUB_NOT_FOUND":
        raise AppError(404, "NOT_FOUND", "社团不存在")
    status_code = 201 if result.get("created") else 200
    response = JSONResponse(status_code=status_code, content=envelope(result))
    if not existing:
        response.set_cookie(
            SESSION_COOKIE, session_id,
            httponly=True, samesite="lax", secure=settings.COOKIE_SECURE, max_age=_SESSION_MAX_AGE,
        )
    return response
