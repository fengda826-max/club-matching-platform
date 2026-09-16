"""运营驾驶舱聚合。等价于原 TS AnalyticsService.ts。只暴露聚合，无 PII。"""
from __future__ import annotations

import math

from sqlalchemy import func, select

from ..db import AIRequestLog, Club, RecruitmentIntent, SessionLocal


def _percent(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0
    return math.floor((numerator / denominator) * 1000 + 0.5) / 10


class AnalyticsService:
    def get_summary(self) -> dict:
        with SessionLocal() as session:
            club_count = session.scalar(select(func.count()).select_from(Club)) or 0
            categories = session.execute(
                select(Club.category, func.count().label("c"))
                .group_by(Club.category).order_by(func.count().desc()).limit(5)
            ).all()
            intent_count = session.scalar(select(func.count()).select_from(RecruitmentIntent)) or 0
            matching_intent_count = session.scalar(
                select(func.count()).select_from(RecruitmentIntent).where(RecruitmentIntent.source == "matching")
            ) or 0
            logs = session.execute(select(
                AIRequestLog.use_case, AIRequestLog.status, AIRequestLog.duration_ms,
                AIRequestLog.input_tokens, AIRequestLog.output_tokens,
                AIRequestLog.fallback_used, AIRequestLog.error_code,
            )).all()

        recommendation_count = sum(1 for log in logs if log.use_case == "recommendation")
        successful = sum(1 for log in logs if log.status == "success")
        total = len(logs)
        return {
            "business": {
                "clubCount": club_count,
                "recommendationCount": recommendation_count,
                "intentCount": intent_count,
                "conversionRate": _percent(matching_intent_count, recommendation_count),
                "topCategories": [{"category": c, "count": n} for c, n in categories],
            },
            "ai": {
                "requestCount": total,
                "successRate": _percent(successful, total),
                "averageDurationMs": (math.floor(sum(log.duration_ms for log in logs) / total + 0.5) if total else 0),
                "validationFailures": sum(1 for log in logs if log.error_code == "INVALID_RESPONSE"),
                "fallbackCount": sum(1 for log in logs if log.fallback_used),
                "inputTokens": sum(log.input_tokens or 0 for log in logs),
                "outputTokens": sum(log.output_tokens or 0 for log in logs),
            },
        }
