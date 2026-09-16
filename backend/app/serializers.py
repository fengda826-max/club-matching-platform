"""ORM → 前端 JSON（camelCase）序列化助手。"""
from __future__ import annotations

from .db import Club
from .schemas import ClubOut


def club_json(club: Club) -> dict:
    return ClubOut.model_validate(club).model_dump(by_alias=True, mode="json")


def clubs_json(clubs: list[Club]) -> list[dict]:
    return [club_json(c) for c in clubs]
