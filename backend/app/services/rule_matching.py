"""规则匹配：确定性硬约束过滤 + 四维打分。等价于原 TS RuleMatchingService.ts。

权重固定：兴趣 40 / 目标 25 / 时间 20(有)或10(无) / 技能 15。AI 不可改动。
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..db import Club
from ..schemas import UserPreference

SKILL_RANK = {"beginner": 0, "intermediate": 1, "advanced": 2, "expert": 3}


@dataclass
class RuleMatch:
    club_id: int
    score: int
    dimensions: dict[str, int]
    evidence: list[str] = field(default_factory=list)
    caveats: list[str] = field(default_factory=list)


def _normalize(value: str) -> str:
    return value.strip().lower()


def _round_half_up(value: float) -> int:
    """复刻 JS Math.round（.5 向 +∞ 取整），避免 Python round 的银行家舍入差异。"""
    return math.floor(value + 0.5)


def _unique_matches(values: list[str], searchable: str) -> list[str]:
    seen: dict[str, None] = {}
    for value in values:
        trimmed = value.strip()
        if len(trimmed) > 0 and _normalize(value) in searchable:
            seen.setdefault(trimmed, None)
    return list(seen.keys())


def _overlap_score(matches: int, requested: int, maximum: int) -> int:
    if requested == 0:
        return _round_half_up(maximum / 2)
    return _round_half_up((matches / requested) * maximum)


def _time_matches(available_time: str, activity_time: str) -> bool:
    requested = _normalize(available_time)
    actual = _normalize(activity_time)
    if requested == "周末":
        return "周六" in actual or "周日" in actual
    if requested == "工作日":
        return any(day in actual for day in ("周一", "周二", "周三", "周四", "周五"))
    return requested in actual


class RuleMatchingService:
    def match(self, preference: UserPreference, clubs: list[Club]) -> list[RuleMatch]:
        scored = [
            self._score_club(preference, club)
            for club in clubs
            if self._passes_hard_constraints(preference, club)
        ]
        scored.sort(key=lambda m: (-m.score, m.club_id))
        return scored

    def _passes_hard_constraints(self, preference: UserPreference, club: Club) -> bool:
        if not club.is_recruiting:
            return False
        if preference.max_fee is not None and club.fee > preference.max_fee:
            return False
        if preference.max_weekly_hours is not None and club.weekly_hours > preference.max_weekly_hours:
            return False
        if preference.campus and club.campus != "全校区" and _normalize(club.campus) != _normalize(preference.campus):
            return False
        if preference.available_times and not any(_time_matches(t, club.activity_time) for t in preference.available_times):
            return False
        user_skill = SKILL_RANK.get(preference.skill_level)
        required_skill = SKILL_RANK.get(club.skill_requirement)
        if required_skill is None or user_skill is None or user_skill < required_skill:
            return False
        return True

    def _score_club(self, preference: UserPreference, club: Club) -> RuleMatch:
        searchable = _normalize(" ".join([
            club.name, club.category, club.tags, club.description, club.requirements,
        ]))
        interests = _unique_matches(preference.interests, searchable)
        goals = _unique_matches(preference.goals, searchable)
        dimensions = {
            "interest": _overlap_score(len(interests), len(preference.interests), 40),
            "goal": _overlap_score(len(goals), len(preference.goals), 25),
            "schedule": 20 if preference.available_times else 10,
            "skill": 15,
        }
        score = max(0, min(100, sum(dimensions.values())))
        evidence: list[str] = []
        if interests:
            evidence.append(f"兴趣：{'、'.join(interests)}")
        if goals:
            evidence.append(f"目标：{'、'.join(goals)}")
        if preference.available_times:
            evidence.append(f"时间：{club.activity_time}")
        evidence.append(f"门槛：{club.skill_requirement}")

        caveats: list[str] = []
        if club.fee > 0:
            caveats.append(f"费用约 {club.fee} 元")
        if club.weekly_hours > 0:
            caveats.append(f"每周约需投入 {club.weekly_hours} 小时")

        return RuleMatch(club_id=club.id, score=score, dimensions=dimensions, evidence=evidence, caveats=caveats)
