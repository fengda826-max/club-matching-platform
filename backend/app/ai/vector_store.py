"""sqlite-vec 向量存储。等价于原 TS ai/vectorStore.ts。

与业务库共用同一个 SQLite 文件，但用独立的 sqlite3 连接管理 vec0 虚拟表
（SQLAlchemy/ORM 无法加载 SQLite 扩展）。

绑定要点：embedding 以 JSON 字符串传入（`[0.1, ...]`）；整数辅助列（clubId）
在 Python 里直接用 int 即可——TS 版的 BigInt 坑是 better-sqlite3 特有的。
"""
from __future__ import annotations

import json
import sqlite3
import threading
from dataclasses import dataclass

import sqlite_vec

from ..config import settings
from ..db import SQLITE_PATH

TABLE = "club_doc_vectors"


@dataclass
class ClubDoc:
    club_id: int
    section: str
    content: str


@dataclass
class VectorHit:
    club_id: int
    section: str
    content: str
    distance: float


class SqliteVecStore:
    def __init__(self, dim: int | None = None) -> None:
        self.dim = dim if dim is not None else settings.AI_EMBEDDING_DIM
        self._lock = threading.Lock()
        self.db = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
        self.db.enable_load_extension(True)
        sqlite_vec.load(self.db)
        self.db.enable_load_extension(False)
        self.db.execute(
            f"CREATE VIRTUAL TABLE IF NOT EXISTS {TABLE} USING vec0("
            f"embedding float[{self.dim}], +clubId integer, +section text, +content text)"
        )

    def index_documents(self, docs: list[ClubDoc], vectors: list[list[float]]) -> None:
        """用向量重建整张表（先清空后批量写入），保证幂等。"""
        if len(docs) != len(vectors):
            raise ValueError("docs and vectors length mismatch")
        with self._lock:
            with self.db:
                self.db.execute(f"DELETE FROM {TABLE}")
                self.db.executemany(
                    f"INSERT INTO {TABLE}(embedding, clubId, section, content) VALUES (?, ?, ?, ?)",
                    [
                        (json.dumps(vectors[i]), int(doc.club_id), doc.section, doc.content)
                        for i, doc in enumerate(docs)
                    ],
                )

    def search(self, query_vector: list[float], k: int) -> list[VectorHit]:
        """KNN：返回最相关的 k 个知识块（按距离升序）。"""
        with self._lock:
            rows = self.db.execute(
                f"SELECT clubId, section, content, distance FROM {TABLE} "
                f"WHERE embedding MATCH ? ORDER BY distance LIMIT ?",
                (json.dumps(query_vector), k),
            ).fetchall()
        return [VectorHit(club_id=int(r[0]), section=r[1], content=r[2], distance=r[3]) for r in rows]

    def is_empty(self) -> bool:
        with self._lock:
            row = self.db.execute(f"SELECT count(*) FROM {TABLE}").fetchone()
        return int(row[0]) == 0

    def count(self) -> int:
        with self._lock:
            row = self.db.execute(f"SELECT count(*) FROM {TABLE}").fetchone()
        return int(row[0])

    def close(self) -> None:
        self.db.close()
