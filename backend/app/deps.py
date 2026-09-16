"""服务装配：懒加载单例，等价于原 TS 各 route 里的 defaultDependencies/defaultService 工厂。"""
from __future__ import annotations

from .ai.providers import AIConfig, AIProvider, create_provider
from .config import settings
from .services.ai_logger import AIRequestLogger
from .services.ai_service import AIService
from .services.analytics import AnalyticsService
from .services.club import ClubService
from .services.intent import IntentService
from .services.recommendation import RecommendationService
from .services.rule_matching import RuleMatchingService
from .services.vector_retrieval import create_vector_retrieval


def _build_config() -> AIConfig:
    return AIConfig(
        provider=settings.AI_PROVIDER,
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
        model=settings.AI_MODEL,
        timeout=settings.AI_TIMEOUT,
        max_retries=settings.AI_MAX_RETRIES,
        temperature=settings.AI_TEMPERATURE,
    )


# ---- 单例 ----
club_service = ClubService()
analytics_service = AnalyticsService()
intent_service = IntentService()
_ai_logger = AIRequestLogger()

_ai_service: AIService | None = None
_matching_service: RecommendationService | None = None
_initialized = False


async def _init() -> None:
    global _ai_service, _matching_service, _initialized
    if _initialized:
        return
    provider: AIProvider | None = create_provider(_build_config())
    if settings.AI_API_KEY:
        await provider.initialize()
    else:
        provider = provider  # 保留实例用于 health（configured=False）
    retrieval = create_vector_retrieval()

    _ai_service = AIService(provider, retrieval, settings.RAG_TOP_K)

    matching_provider = provider if settings.AI_API_KEY else None
    _matching_service = RecommendationService(
        provider=matching_provider,
        club_service=club_service,
        rule_service=RuleMatchingService(),
        logger=_ai_logger,
        retrieval=create_vector_retrieval(),
        rag_top_k=settings.RAG_TOP_K,
    )
    _initialized = True


async def get_ai_service() -> AIService:
    await _init()
    assert _ai_service is not None
    return _ai_service


async def get_matching_service() -> RecommendationService:
    await _init()
    assert _matching_service is not None
    return _matching_service


def get_ai_logger() -> AIRequestLogger:
    return _ai_logger
