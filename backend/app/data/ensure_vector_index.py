"""构建/重建社团知识的向量索引。等价于原 TS data/ensureVectorIndex.ts。
无 Key 或已建好则跳过（除非 force）。返回写入的知识块数量。
"""
from __future__ import annotations

from sqlalchemy import select

from ..ai.embeddings import create_embeddings
from ..ai.vector_store import ClubDoc, SqliteVecStore
from ..db import Club, SessionLocal
from .club_knowledge import flatten_knowledge


async def ensure_vector_index(enabled: bool, api_key: str, force: bool = False) -> int:
    if not enabled or not api_key:
        return 0

    store = SqliteVecStore()
    try:
        if not force and not store.is_empty():
            return 0

        with SessionLocal() as session:
            clubs = session.execute(select(Club.id, Club.name)).all()
        clubs_by_name = {name: club_id for club_id, name in clubs}
        docs = [ClubDoc(**d) for d in flatten_knowledge(clubs_by_name)]
        if not docs:
            return 0

        embeddings = create_embeddings()
        vectors = await embeddings.aembed_documents([doc.content for doc in docs])
        store.index_documents(docs, vectors)
        return len(docs)
    finally:
        store.close()
