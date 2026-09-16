"""按需注入演示社团。等价于原 TS data/ensureDemoData.ts。"""
from __future__ import annotations

from sqlalchemy import func, select

from ..db import Club, SessionLocal
from .demo_clubs import DEMO_CLUBS


def ensure_demo_data(enabled: bool) -> int:
    if not enabled:
        return 0
    with SessionLocal() as session:
        count = session.scalar(select(func.count()).select_from(Club)) or 0
        if count > 0:
            return 0
        session.add_all([Club(**data) for data in DEMO_CLUBS])
        session.commit()
    return len(DEMO_CLUBS)
