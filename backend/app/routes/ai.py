"""AI 路由：健康检查、SSE 流式问答、非流式问答、内容生成。
等价于原 TS routes/ai.ts。SSE 事件格式 event: metadata/chunk/usage/done/error 逐字保留。
"""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..ai.errors import AIError
from ..deps import club_service, get_ai_logger, get_ai_service
from ..errors import envelope
from ..schemas import ChatRequest, GenerateDescriptionRequest, SuggestTagsRequest
from ..security import require_admin

router = APIRouter()

_SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/health")
async def health():
    ai = await get_ai_service()
    info = ai.get_provider_info()
    return envelope({"healthy": info.configured, "provider": asdict(info)})


@router.post("/chat/stream")
async def chat_stream(input: ChatRequest):
    started = time.time()
    ai = await get_ai_service()
    logger = get_ai_logger()
    all_clubs = club_service.get_all_clubs()
    info = ai.get_provider_info()

    if not info.configured:
        fallback = ai.get_grounded_fallback(input.message, all_clubs)

        def gen_fallback():
            yield _sse("metadata", {"requestId": str(uuid.uuid4()), "model": fallback["model"], "sources": fallback["sources"]})
            yield _sse("chunk", {"text": fallback["text"]})
            duration = int((time.time() - started) * 1000)
            yield _sse("usage", {"durationMs": duration})
            yield _sse("done", {})
            logger.record({"useCase": "chat", "provider": info.id, "model": fallback["model"], "status": "fallback", "durationMs": duration, "fallbackUsed": True, "errorCode": "UNCONFIGURED"})

        return StreamingResponse(gen_fallback(), media_type="text/event-stream; charset=utf-8", headers=_SSE_HEADERS)

    grounded = await ai.grounded_chat(input.message, input.history, all_clubs)

    async def gen():
        yield _sse("metadata", {"requestId": str(uuid.uuid4()), "model": grounded["model"], "sources": grounded["sources"]})
        chunk_count = 0
        try:
            async for text in grounded["stream"]:
                chunk_count += 1
                yield _sse("chunk", {"text": text})
        except Exception as error:  # noqa: BLE001
            if chunk_count > 0:
                safe_code = error.code if isinstance(error, AIError) else "STREAM_ERROR"
                yield _sse("error", {"code": safe_code, "message": "回答生成中断，请稍后重试"})
                duration = int((time.time() - started) * 1000)
                logger.record({"useCase": "chat", "provider": info.id, "model": "unknown", "status": "error", "durationMs": duration, "fallbackUsed": False, "errorCode": safe_code})
                return
            safe_code = error.code if isinstance(error, AIError) else "STREAM_ERROR"
            yield _sse("chunk", {"text": grounded["fallbackText"]})
            duration = int((time.time() - started) * 1000)
            yield _sse("usage", {"durationMs": duration})
            yield _sse("done", {})
            logger.record({"useCase": "chat", "provider": info.id, "model": grounded["model"], "status": "fallback", "durationMs": duration, "fallbackUsed": True, "errorCode": safe_code})
            return
        duration = int((time.time() - started) * 1000)
        yield _sse("usage", {"durationMs": duration})
        yield _sse("done", {})
        logger.record({"useCase": "chat", "provider": info.id, "model": grounded["model"], "status": "success", "durationMs": duration, "fallbackUsed": False})

    return StreamingResponse(gen(), media_type="text/event-stream; charset=utf-8", headers=_SSE_HEADERS)


@router.post("/chat")
async def chat(input: ChatRequest):
    ai = await get_ai_service()
    result = await ai.chat_complete(input.message, input.history, club_service.get_all_clubs())
    return envelope({"response": result})


@router.post("/generate-description", dependencies=[Depends(require_admin)])
async def generate_description(payload: GenerateDescriptionRequest):
    ai = await get_ai_service()
    description = await ai.generate_description(payload.name, payload.category)
    return envelope({"description": description})


@router.post("/suggest-tags", dependencies=[Depends(require_admin)])
async def suggest_tags(payload: SuggestTagsRequest):
    ai = await get_ai_service()
    tags = await ai.suggest_tags(payload.name, payload.category, payload.description)
    return envelope({"tags": tags})
