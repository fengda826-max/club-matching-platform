"""Pydantic 模型：等价于原 TS 的 Zod schemas + 前端 API 契约。

前端 client.ts 用 camelCase 字段，这里统一用 alias_generator=to_camel，
Python 属性 snake_case，对外 JSON camelCase，保证前端零改动。
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

SkillLevel = Literal["beginner", "intermediate", "advanced", "expert"]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class StrictCamelModel(CamelModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )


# ---------- Club ----------

class ClubOut(CamelModel):
    id: int
    name: str
    category: str
    description: str
    requirements: str
    member_count: int
    contact: str
    tags: str
    activity_time: str
    weekly_hours: int
    campus: str
    fee: int
    skill_requirement: SkillLevel
    is_recruiting: bool
    created_at: datetime
    updated_at: datetime


class ClubCreate(StrictCamelModel):
    name: Annotated[str, Field(min_length=2, max_length=50)]
    category: Annotated[str, Field(min_length=1, max_length=30)]
    description: Annotated[str, Field(min_length=10, max_length=1000)]
    requirements: Annotated[str, Field(min_length=1, max_length=500)]
    member_count: Annotated[int, Field(ge=0, le=100000)]
    contact: Annotated[str, Field(min_length=1, max_length=200)]
    tags: Annotated[str, Field(max_length=500)] = ""
    activity_time: Annotated[str, Field(max_length=100)] = ""
    weekly_hours: Annotated[int, Field(ge=0, le=168)] = 0
    campus: Annotated[str, Field(max_length=100)] = ""
    fee: Annotated[int, Field(ge=0, le=100000)] = 0
    skill_requirement: SkillLevel = "beginner"
    is_recruiting: bool = True

    @field_validator("name", "category", "description", "requirements", "contact", "tags", "activity_time", "campus", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ClubUpdate(StrictCamelModel):
    name: Annotated[str, Field(min_length=2, max_length=50)] | None = None
    category: Annotated[str, Field(min_length=1, max_length=30)] | None = None
    description: Annotated[str, Field(min_length=10, max_length=1000)] | None = None
    requirements: Annotated[str, Field(min_length=1, max_length=500)] | None = None
    member_count: Annotated[int, Field(ge=0, le=100000)] | None = None
    contact: Annotated[str, Field(min_length=1, max_length=200)] | None = None
    tags: Annotated[str, Field(max_length=500)] | None = None
    activity_time: Annotated[str, Field(max_length=100)] | None = None
    weekly_hours: Annotated[int, Field(ge=0, le=168)] | None = None
    campus: Annotated[str, Field(max_length=100)] | None = None
    fee: Annotated[int, Field(ge=0, le=100000)] | None = None
    skill_requirement: SkillLevel | None = None
    is_recruiting: bool | None = None


# ---------- Matching ----------

def _dedupe_preference_list(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for raw in values:
        item = raw.strip()
        if not (1 <= len(item) <= 30):
            raise ValueError("每项长度需在 1-30 之间")
        cleaned.append(item)
    if len(cleaned) > 10:
        raise ValueError("最多 10 项")
    seen: set[str] = set()
    result: list[str] = []
    for item in cleaned:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


class UserPreference(StrictCamelModel):
    interests: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    skill_level: SkillLevel = "beginner"
    available_times: list[str] = Field(default_factory=list)
    campus: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    max_weekly_hours: Annotated[int, Field(ge=0, le=168)] | None = None
    max_fee: Annotated[int, Field(ge=0, le=100000)] | None = None

    @field_validator("interests", "goals", "available_times", mode="before")
    @classmethod
    def _clean_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("必须是字符串数组")
        return _dedupe_preference_list([str(v) for v in value])

    @field_validator("campus", mode="before")
    @classmethod
    def _strip_campus(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ExtractionRequest(StrictCamelModel):
    text: Annotated[str, Field(min_length=2, max_length=1000)]

    @field_validator("text", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


# ---------- Chat ----------

class ChatMessage(StrictCamelModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=1, max_length=2000)]

    @field_validator("content", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ChatRequest(StrictCamelModel):
    message: Annotated[str, Field(min_length=1, max_length=1000)]
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)

    @field_validator("message", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


# ---------- Intent / Auth / Content gen ----------

class IntentRequest(StrictCamelModel):
    club_id: Annotated[int, Field(gt=0)]
    source: Literal["matching", "browsing"]
    match_score: Annotated[int, Field(ge=0, le=100)] | None = None


class LoginRequest(StrictCamelModel):
    password: Annotated[str, Field(min_length=1, max_length=200)]


class GenerateDescriptionRequest(CamelModel):
    name: str
    category: str


class SuggestTagsRequest(CamelModel):
    name: str
    category: str
    description: str


# ---------- AI structured output（内部用，校验模型返回）----------

class ExplanationItem(StrictCamelModel):
    club_id: Annotated[int, Field(gt=0)]
    reason: Annotated[str, Field(min_length=10, max_length=240)]
    caveats: list[Annotated[str, Field(min_length=1, max_length=100)]] = Field(max_length=3)

    @field_validator("reason", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ExplanationResult(StrictCamelModel):
    matches: list[ExplanationItem] = Field(max_length=5)


class TagResult(BaseModel):
    tags: list[Annotated[str, Field(min_length=1)]] = Field(min_length=1, max_length=8)
