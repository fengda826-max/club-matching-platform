"""匹配路由：NL→偏好抽取 + 混合推荐。等价于原 TS routes/matching.ts。"""
from __future__ import annotations

from fastapi import APIRouter

from ..deps import get_matching_service
from ..errors import envelope
from ..schemas import ExtractionRequest, UserPreference

router = APIRouter()


@router.post("/extract-preferences")
async def extract_preferences(payload: ExtractionRequest):
    service = await get_matching_service()
    result = await service.extract_preferences(payload.text)
    return envelope(result)


@router.post("/recommend")
async def recommend(preference: UserPreference):
    service = await get_matching_service()
    result = await service.recommend(preference)
    return envelope(result)
