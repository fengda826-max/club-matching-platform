"""社团数据服务。等价于原 TS ClubService.ts（Prisma → SQLAlchemy）。"""
from __future__ import annotations

from sqlalchemy import func, or_, select

from ..db import Club, SessionLocal
from ..errors import AppError


class ClubService:
    def get_all_clubs(self) -> list[Club]:
        with SessionLocal() as session:
            return list(session.scalars(select(Club).order_by(Club.created_at.desc())))

    def get_club_by_id(self, club_id: int) -> Club | None:
        with SessionLocal() as session:
            return session.get(Club, club_id)

    def create_club(self, data: dict) -> Club:
        with SessionLocal() as session:
            exists = session.scalar(select(Club.id).where(Club.name == data["name"]))
            if exists is not None:
                raise AppError(409, "CONFLICT", "数据操作失败")
            club = Club(**data)
            session.add(club)
            session.commit()
            return club

    def update_club(self, club_id: int, data: dict) -> Club:
        with SessionLocal() as session:
            club = session.get(Club, club_id)
            if club is None:
                raise AppError(404, "NOT_FOUND", "数据操作失败")
            if "name" in data and data["name"] != club.name:
                clash = session.scalar(select(Club.id).where(Club.name == data["name"]))
                if clash is not None:
                    raise AppError(409, "CONFLICT", "数据操作失败")
            for key, value in data.items():
                setattr(club, key, value)
            session.commit()
            return club

    def delete_club(self, club_id: int) -> Club:
        with SessionLocal() as session:
            club = session.get(Club, club_id)
            if club is None:
                raise AppError(404, "NOT_FOUND", "数据操作失败")
            session.delete(club)
            session.commit()
            return club

    def get_statistics(self) -> dict:
        with SessionLocal() as session:
            total_clubs = session.scalar(select(func.count()).select_from(Club)) or 0
            categories = session.execute(
                select(Club.category, func.count()).group_by(Club.category)
            ).all()
            total_members = session.scalar(select(func.coalesce(func.sum(Club.member_count), 0))) or 0
        return {
            "totalClubs": total_clubs,
            "totalMembers": total_members,
            "categories": [{"category": c, "count": n} for c, n in categories],
        }

    def search_clubs(self, keyword: str) -> list[Club]:
        pattern = f"%{keyword}%"
        with SessionLocal() as session:
            return list(session.scalars(select(Club).where(or_(
                Club.name.like(pattern),
                Club.description.like(pattern),
                Club.tags.like(pattern),
                Club.category.like(pattern),
            ))))

    def filter_by_category(self, category: str) -> list[Club]:
        with SessionLocal() as session:
            return list(session.scalars(select(Club).where(Club.category == category)))

    def get_all_tags(self) -> list[str]:
        with SessionLocal() as session:
            rows = session.scalars(select(Club.tags))
            tag_set: set[str] = set()
            for tags in rows:
                for tag in tags.split(","):
                    trimmed = tag.strip()
                    if trimmed:
                        tag_set.add(trimmed)
        return sorted(tag_set)
