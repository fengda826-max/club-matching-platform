"""AI 运行遥测（尽力而为）。等价于原 TS AIRequestLogger.ts。
只记录运行指标，绝不记录 prompt / 回答 / 学生身份。日志失败绝不影响业务。
"""
from __future__ import annotations

from ..db import AIRequestLog, SessionLocal


class AIRequestLogger:
    def record(self, entry: dict) -> None:
        try:
            with SessionLocal() as session:
                session.add(AIRequestLog(
                    use_case=entry["useCase"],
                    provider=entry["provider"],
                    model=entry["model"],
                    status=entry["status"],
                    duration_ms=entry.get("durationMs", 0),
                    input_tokens=entry.get("inputTokens"),
                    output_tokens=entry.get("outputTokens"),
                    fallback_used=entry.get("fallbackUsed", False),
                    error_code=entry.get("errorCode"),
                ))
                session.commit()
        except Exception:
            pass  # 遥测失败故意吞掉，业务响应优先
