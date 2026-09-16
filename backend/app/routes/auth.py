"""管理鉴权路由。等价于原 TS routes/auth.ts。HMAC 签名 Cookie。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse

from ..config import settings
from ..errors import envelope
from ..schemas import LoginRequest
from ..security import ADMIN_COOKIE, create_admin_token, passwords_equal, login_rate_limit, verify_admin_token

router = APIRouter()

_ADMIN_MAX_AGE = 8 * 60 * 60  # 秒


@router.post("/login", dependencies=[Depends(login_rate_limit)])
async def login(payload: LoginRequest):
    if not settings.ADMIN_PASSWORD or not settings.SESSION_SECRET or not passwords_equal(payload.password, settings.ADMIN_PASSWORD):
        return JSONResponse(status_code=401, content={"success": False, "error": "INVALID_CREDENTIALS", "message": "密码错误"})
    response = JSONResponse(content=envelope({"authenticated": True}))
    response.set_cookie(
        ADMIN_COOKIE, create_admin_token(settings.SESSION_SECRET),
        httponly=True, samesite="lax", secure=settings.COOKIE_SECURE, max_age=_ADMIN_MAX_AGE, path="/",
    )
    return response


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(ADMIN_COOKIE, httponly=True, samesite="lax", secure=settings.COOKIE_SECURE, path="/")
    return envelope({"authenticated": False})


@router.get("/status")
async def status(request: Request):
    token = request.cookies.get(ADMIN_COOKIE)
    return envelope({"authenticated": verify_admin_token(token, settings.SESSION_SECRET)})
