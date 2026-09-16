"""运营分析路由。等价于原 TS routes/analytics.ts。"""
from __future__ import annotations

from fastapi import APIRouter

from ..deps import analytics_service
from ..errors import envelope

router = APIRouter()


@router.get("/summary")
async def summary():
    return envelope(analytics_service.get_summary())
