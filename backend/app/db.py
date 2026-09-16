"""数据库层：SQLAlchemy 2.0 ORM + SQLite。等价于原 Prisma schema + lib/prisma.ts。

三张表：Club / RecruitmentIntent / AIRequestLog。
向量表 club_doc_vectors 不在这里管理——它是 sqlite-vec 的虚拟表，由
app/ai/vector_store.py 用独立连接创建（SQLAlchemy/ORM 无法加载 SQLite 扩展）。
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column, relationship, sessionmaker

from .config import settings


def _resolve_sqlite_path() -> str:
    """把 Prisma 风格的 DATABASE_URL（file:./dev.db / file:/data/app.db）解析成文件路径。"""
    raw = settings.DATABASE_URL
    path = raw[len("file:"):] if raw.startswith("file:") else raw
    if os.path.isabs(path):
        return path
    # 相对路径按 backend/ 目录解析（config 所在目录的上一级）
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.normpath(os.path.join(base, path))


SQLITE_PATH = _resolve_sqlite_path()
os.makedirs(os.path.dirname(SQLITE_PATH) or ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{SQLITE_PATH}",
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Club(Base):
    __tablename__ = "Club"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    category: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    requirements: Mapped[str] = mapped_column(String)
    member_count: Mapped[int] = mapped_column("memberCount", Integer)
    contact: Mapped[str] = mapped_column(String)
    tags: Mapped[str] = mapped_column(String)  # 逗号分隔
    activity_time: Mapped[str] = mapped_column("activityTime", String, default="")
    weekly_hours: Mapped[int] = mapped_column("weeklyHours", Integer, default=0)
    campus: Mapped[str] = mapped_column(String, default="")
    fee: Mapped[int] = mapped_column(Integer, default=0)
    skill_requirement: Mapped[str] = mapped_column("skillRequirement", String, default="beginner")
    is_recruiting: Mapped[bool] = mapped_column("isRecruiting", Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime, default=_utcnow, onupdate=_utcnow
    )

    intents: Mapped[list["RecruitmentIntent"]] = relationship(
        back_populates="club", cascade="all, delete-orphan"
    )


class RecruitmentIntent(Base):
    __tablename__ = "RecruitmentIntent"
    __table_args__ = (UniqueConstraint("clubId", "sessionId", name="uq_intent_club_session"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(
        "clubId", Integer, ForeignKey("Club.id", ondelete="CASCADE")
    )
    source: Mapped[str] = mapped_column(String)
    match_score: Mapped[int | None] = mapped_column("matchScore", Integer, nullable=True)
    session_id: Mapped[str] = mapped_column("sessionId", String)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, default=_utcnow)

    club: Mapped["Club"] = relationship(back_populates="intents")


class AIRequestLog(Base):
    __tablename__ = "AIRequestLog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    use_case: Mapped[str] = mapped_column("useCase", String)
    provider: Mapped[str] = mapped_column(String)
    model: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    duration_ms: Mapped[int] = mapped_column("durationMs", Integer)
    input_tokens: Mapped[int | None] = mapped_column("inputTokens", Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column("outputTokens", Integer, nullable=True)
    fallback_used: Mapped[bool] = mapped_column("fallbackUsed", Boolean, default=False)
    error_code: Mapped[str | None] = mapped_column("errorCode", String, nullable=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, default=_utcnow)


def init_db() -> None:
    """建表（若不存在）。"""
    Base.metadata.create_all(engine)
