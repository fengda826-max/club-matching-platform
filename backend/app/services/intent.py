"""招新意向记录（匿名、按 clubId+sessionId 去重）。等价于原 TS IntentService.ts。"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..db import Club, RecruitmentIntent, SessionLocal


class IntentService:
    def record(self, club_id: int, source: str, session_id: str, match_score: int | None = None) -> dict:
        with SessionLocal() as session:
            exists = session.scalar(select(Club.id).where(Club.id == club_id))
            if exists is None:
                return {"created": False, "reason": "CLUB_NOT_FOUND"}
            intent = RecruitmentIntent(
                club_id=club_id, source=source, match_score=match_score, session_id=session_id
            )
            session.add(intent)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                return {"created": False}
            return {"created": True}
