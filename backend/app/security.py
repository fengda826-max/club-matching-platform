"""鉴权与限流。HMAC 签名的管理会话 Cookie（等价 middleware/adminAuth.ts），
内存版固定窗口限流（等价 express-rate-limit 的内存 store）。"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import uuid
from collections import defaultdict, deque

from fastapi import Request

from .config import settings
from .errors import AppError

ADMIN_COOKIE = "campusmatch_admin"
SESSION_COOKIE = "campusmatch_session"
ADMIN_LIFETIME_MS = 8 * 60 * 60 * 1000


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _signature(value: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).digest()
    return _b64url_encode(digest)


def create_admin_token(secret: str, lifetime_ms: int = ADMIN_LIFETIME_MS) -> str:
    payload_obj = {"sid": str(uuid.uuid4()), "exp": int(time.time() * 1000) + lifetime_ms}
    payload = _b64url_encode(json.dumps(payload_obj, separators=(",", ":")).encode("utf-8"))
    return f"{payload}.{_signature(payload, secret)}"


def verify_admin_token(token: str | None, secret: str) -> bool:
    if not token or not secret:
        return False
    parts = token.split(".")
    if len(parts) != 2:
        return False
    payload, supplied = parts
    if not payload or not supplied:
        return False
    expected = _signature(payload, secret)
    if not hmac.compare_digest(supplied, expected):
        return False
    try:
        parsed = json.loads(_b64url_decode(payload).decode("utf-8"))
    except Exception:
        return False
    return (
        isinstance(parsed.get("sid"), str)
        and isinstance(parsed.get("exp"), (int, float))
        and parsed["exp"] > int(time.time() * 1000)
    )


def passwords_equal(left: str, right: str) -> bool:
    a = hashlib.sha256(left.encode("utf-8")).digest()
    b = hashlib.sha256(right.encode("utf-8")).digest()
    return hmac.compare_digest(a, b)


def require_admin(request: Request) -> None:
    """FastAPI 依赖：校验管理 Cookie，失败抛 401。"""
    token = request.cookies.get(ADMIN_COOKIE)
    if not verify_admin_token(token, settings.SESSION_SECRET):
        raise AppError(401, "UNAUTHORIZED", "请先登录管理后台")


class RateLimiter:
    """固定窗口内存限流，按客户端 IP 计数。"""

    def __init__(self, window_ms: int, limit: int) -> None:
        self.window_ms = window_ms
        self.limit = limit
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, request: Request) -> None:
        client = request.client.host if request.client else "unknown"
        now = time.time() * 1000
        window_start = now - self.window_ms
        hits = self._hits[client]
        while hits and hits[0] < window_start:
            hits.popleft()
        if len(hits) >= self.limit:
            raise AppError(429, "RATE_LIMITED", "请求过于频繁，请稍后再试")
        hits.append(now)


login_rate_limiter = RateLimiter(window_ms=10 * 60 * 1000, limit=5)
ai_rate_limiter = RateLimiter(window_ms=60 * 1000, limit=20)


def login_rate_limit(request: Request) -> None:
    login_rate_limiter.check(request)


def ai_rate_limit(request: Request) -> None:
    ai_rate_limiter.check(request)
