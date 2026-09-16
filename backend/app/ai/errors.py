"""统一 AI 错误类型。等价于原 TS providers/errors.ts。"""
from __future__ import annotations

from typing import Literal

AIErrorCode = Literal[
    "INVALID_CONFIG",
    "INVALID_API_KEY",
    "SERVICE_UNAVAILABLE",
    "RATE_LIMIT_EXCEEDED",
    "CONTEXT_OVERFLOW",
    "INVALID_RESPONSE",
    "NETWORK_ERROR",
    "TIMEOUT",
]


class AIError(Exception):
    def __init__(self, code: str, message: str, provider: str, cause: object = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.provider = provider
        self.cause = cause


class AIConfigError(AIError):
    def __init__(self, message: str, provider: str) -> None:
        super().__init__("INVALID_CONFIG", message, provider)
