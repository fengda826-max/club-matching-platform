"""通过 LangChain 的 OpenAIEmbeddings 连接百炼（DashScope）兼容端点。
等价于原 TS ai/embeddings.ts。只做“文本→向量”，对话仍走 providers.py。

百炼 text-embedding-v3：1024 维，批量上限 10，与 OpenAI /embeddings 协议兼容。
"""
from __future__ import annotations

from langchain_openai import OpenAIEmbeddings

from ..config import settings


def create_embeddings() -> OpenAIEmbeddings:
    if not settings.AI_API_KEY:
        raise RuntimeError("AI_API_KEY is required to create embeddings")
    return OpenAIEmbeddings(
        api_key=settings.AI_API_KEY,
        model=settings.AI_EMBEDDING_MODEL,
        dimensions=settings.AI_EMBEDDING_DIM,
        chunk_size=10,  # 百炼批量上限
        base_url=settings.AI_BASE_URL,
        # 百炼 /embeddings 只接受字符串输入；关掉 LangChain 默认的
        # tiktoken 分词逻辑（否则会发送 token-id 数组，被百炼拒绝）
        check_embedding_ctx_length=False,
    )
