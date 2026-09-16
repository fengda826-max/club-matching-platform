"""重建 sqlite-vec 知识索引（等价于原 TS scripts/index-vectors.ts）。

用法（在 backend/ 下）：python -m scripts.index_vectors
需要配置 AI_API_KEY 且 RAG_ENABLED=true。
"""
from __future__ import annotations

import asyncio

from app.config import settings
from app.data.ensure_vector_index import ensure_vector_index
from app.db import init_db


async def main() -> None:
    init_db()
    count = await ensure_vector_index(enabled=settings.RAG_ENABLED, api_key=settings.AI_API_KEY, force=True)
    print(f"indexed {count} passages")


if __name__ == "__main__":
    asyncio.run(main())
