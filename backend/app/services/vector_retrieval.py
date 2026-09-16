"""语义召回服务：查询文本 embed → sqlite-vec KNN。等价于原 TS VectorRetrievalService.ts。

混合检索的“第一层”（语义相关）；规则层仍是权威的“合格 + 打分”。
任一步失败都会抛出，交由上层降级到关键词 / 规则逻辑。
"""
from __future__ import annotations

from ..ai.embeddings import create_embeddings
from ..ai.vector_store import SqliteVecStore, VectorHit
from ..config import settings


class VectorRetrievalService:
    def __init__(self, embeddings, store: SqliteVecStore) -> None:
        self.embeddings = embeddings
        self.store = store

    async def retrieve_passages(self, query_text: str, k: int) -> list[VectorHit]:
        trimmed = query_text.strip()
        if not trimmed:
            return []
        vector = await self.embeddings.aembed_query(trimmed)
        # 多取知识块（k 个社团 × 每社团若干段落），下游再按需去重
        return self.store.search(vector, max(k * 3, k))

    async def retrieve_club_ids(self, query_text: str, k: int) -> list[int]:
        hits = await self.retrieve_passages(query_text, k)
        best_distance: dict[int, float] = {}
        for hit in hits:
            current = best_distance.get(hit.club_id)
            if current is None or hit.distance < current:
                best_distance[hit.club_id] = hit.distance
        ordered = sorted(best_distance.items(), key=lambda kv: kv[1])
        return [club_id for club_id, _ in ordered[:k]]


def create_vector_retrieval() -> VectorRetrievalService | None:
    """RAG 开启且有 Key 时返回实例，否则 None（上层回落关键词/规则）。构造不触发网络。"""
    if not settings.RAG_ENABLED or not settings.AI_API_KEY:
        return None
    try:
        store = SqliteVecStore()
        return VectorRetrievalService(create_embeddings(), store)
    except Exception:
        return None
