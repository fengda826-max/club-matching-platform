"""社团 CRUD 与查询路由。等价于原 TS routes/clubs.ts。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Path

from ..deps import club_service
from ..errors import AppError, envelope
from ..schemas import ClubCreate, ClubUpdate
from ..security import require_admin
from ..serializers import club_json, clubs_json

router = APIRouter()


@router.get("")
async def list_clubs():
    return envelope(clubs_json(club_service.get_all_clubs()))


@router.get("/statistics/summary")
async def statistics_summary():
    return envelope(club_service.get_statistics())


@router.get("/search/{keyword}")
async def search_clubs(keyword: str):
    return envelope(clubs_json(club_service.search_clubs(keyword[:100])))


@router.get("/tags/all")
async def all_tags():
    return envelope(club_service.get_all_tags())


@router.get("/category/{category}")
async def by_category(category: str):
    return envelope(clubs_json(club_service.filter_by_category(category[:30])))


@router.get("/{club_id}")
async def get_club(club_id: int = Path(gt=0)):
    club = club_service.get_club_by_id(club_id)
    if club is None:
        raise AppError(404, "NOT_FOUND", "社团不存在")
    return envelope(club_json(club))


@router.post("", status_code=201, dependencies=[Depends(require_admin)])
async def create_club(payload: ClubCreate):
    club = club_service.create_club(payload.model_dump(by_alias=False))
    return envelope(club_json(club))


@router.put("/{club_id}", dependencies=[Depends(require_admin)])
async def update_club(payload: ClubUpdate, club_id: int = Path(gt=0)):
    data = payload.model_dump(by_alias=False, exclude_unset=True)
    club = club_service.update_club(club_id, data)
    return envelope(club_json(club))


@router.delete("/{club_id}", dependencies=[Depends(require_admin)])
async def delete_club(club_id: int = Path(gt=0)):
    club = club_service.delete_club(club_id)
    return envelope(club_json(club))
