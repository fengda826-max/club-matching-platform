"""混合推荐：向量召回 → 规则打分（权威） → AI 只写理由。
等价于原 TS RecommendationService.ts。评分/排序/降级链完全保留。
"""
from __future__ import annotations

import json

from ..ai.providers import AICompletion, AIProvider
from ..ai.errors import AIError
from ..db import Club
from ..errors import AppError
from ..schemas import ClubOut, ExplanationResult, UserPreference
from .rule_matching import RuleMatch, RuleMatchingService
from .vector_retrieval import VectorRetrievalService

_EXTRACT_SYSTEM_PROMPT = """从用户的社团需求中提取偏好。只返回一个 JSON 对象，不要解释、Markdown 或额外字段。
严格使用以下字段和类型：
{"interests":["字符串"],"goals":["字符串"],"skillLevel":"beginner|intermediate|advanced|expert","availableTimes":["字符串"],"campus":"字符串（可省略）","maxWeeklyHours":整数（可省略）,"maxFee":整数（可省略）}
规则：
- 未表达的 interests、goals、availableTimes 返回空数组。
- 未表达的可选字段直接省略，禁止返回 null。
- “零基础/新手”映射 beginner；“有一定基础”映射 intermediate；“熟练”映射 advanced；“专家”映射 expert。
- “免费/不想交会费”映射 maxFee=0；时间和费用只返回数字。
- 不推测用户未表达的硬约束。"""

_EXPLANATION_SYSTEM_PROMPT = """你负责把已有规则证据写成简洁推荐理由。只返回一个 JSON 对象，不要解释或 Markdown。
严格格式：{"matches":[{"clubId":候选社团整数ID,"reason":"10到240字的中文理由","caveats":["最多3条注意事项"]}]}
每个候选 clubId 必须且只能出现一次，顺序与候选列表一致。不得改变分数、添加候选之外的社团、遗漏候选或编造事实。没有额外注意事项时 caveats 返回空数组。"""


def _club_out(club: Club) -> dict:
    return ClubOut.model_validate(club).model_dump(by_alias=True, mode="json")


def _public_club_facts(club: Club) -> dict:
    facts = _club_out(club)
    for key in ("contact", "createdAt", "updatedAt"):
        facts.pop(key, None)
    return facts


def _match_base(match: RuleMatch) -> dict:
    return {
        "clubId": match.club_id,
        "score": match.score,
        "dimensions": match.dimensions,
        "evidence": match.evidence,
        "caveats": match.caveats,
    }


class RecommendationService:
    def __init__(
        self,
        provider: AIProvider | None,
        club_service,
        rule_service: RuleMatchingService,
        logger,
        retrieval: VectorRetrievalService | None = None,
        rag_top_k: int = 5,
    ) -> None:
        self.provider = provider
        self.club_service = club_service
        self.rule_service = rule_service
        self.logger = logger
        self.retrieval = retrieval
        self.rag_top_k = rag_top_k

    async def extract_preferences(self, text: str, signal: object = None) -> dict:
        if not self.provider:
            raise AppError(503, "AI_UNAVAILABLE", "自然语言解析暂不可用，请改用结构化表单")
        try:
            result = await self.provider.generate_structured(
                UserPreference, _EXTRACT_SYSTEM_PROMPT, f"用户需求：{text}", 500, signal
            )
            self._log_completion("preference-extraction", result, False, "success")
            preference: UserPreference = result.data
            warnings = []
            if not preference.campus:
                warnings.append("未指定校区")
            if preference.max_weekly_hours is None:
                warnings.append("未指定每周投入时间")
            if preference.max_fee is None:
                warnings.append("未指定费用上限")
            return {
                "preference": preference.model_dump(by_alias=True, exclude_none=True),
                "mode": "ai-extracted",
                "warnings": warnings,
            }
        except AppError:
            raise
        except Exception as error:
            self._log_failure("preference-extraction", error, False)
            raise AppError(503, "AI_UNAVAILABLE", "自然语言解析暂不可用，请保留原文并改用结构化表单")

    async def recommend(self, preference: UserPreference, signal: object = None) -> dict:
        all_clubs = self.club_service.get_all_clubs()
        club_by_id = {club.id: club for club in all_clubs}
        clubs = await self._apply_vector_recall(preference, all_clubs)
        rule_matches = [m for m in self.rule_service.match(preference, clubs) if m.club_id in club_by_id][:5]

        if not rule_matches or not self.provider:
            self._log_fallback("NO_CANDIDATES" if self.provider else "UNCONFIGURED")
            warning = "没有社团满足当前硬约束" if self.provider else "模型未配置，已使用规则评分"
            return self._rules_only(rule_matches, club_by_id, warning)

        candidates = [
            {**_match_base(match), "club": _public_club_facts(club_by_id[match.club_id])}
            for match in rule_matches
        ]
        payload = {
            "preference": preference.model_dump(by_alias=True, exclude_none=True),
            "candidates": candidates,
        }
        try:
            result = await self.provider.generate_structured(
                ExplanationResult,
                _EXPLANATION_SYSTEM_PROMPT,
                json.dumps(payload, ensure_ascii=False),
                900,
                signal,
            )
            explanation: ExplanationResult = result.data
            ids = [item.club_id for item in explanation.matches]
            self._assert_explanation_ids(ids, rule_matches)
            explanation_by_id = {item.club_id: item for item in explanation.matches}
            matches = []
            for match in rule_matches:
                item = explanation_by_id.get(match.club_id)
                if item is None:
                    raise AIError("INVALID_RESPONSE", "Missing candidate explanation", result.provider)
                merged_caveats = list(dict.fromkeys([*match.caveats, *item.caveats]))
                matches.append({
                    **_match_base(match),
                    "caveats": merged_caveats,
                    "club": _club_out(club_by_id[match.club_id]),
                    "reason": item.reason,
                })
            self._log_completion("recommendation", result, False, "success")
            return {"mode": "hybrid", "matches": matches}
        except Exception as error:
            self._log_failure("recommendation", error, True)
            return self._rules_only(rule_matches, club_by_id, "模型说明不可用，已降级为可复现的规则结果")

    async def _apply_vector_recall(self, preference: UserPreference, clubs: list[Club]) -> list[Club]:
        if not self.retrieval:
            return clubs
        parts = [*preference.interests, *preference.goals, *preference.available_times]
        if preference.campus:
            parts.append(preference.campus)
        query_text = "，".join(p for p in parts if p and p.strip())
        if not query_text.strip():
            return clubs
        try:
            recalled_ids = await self.retrieval.retrieve_club_ids(query_text, max(self.rag_top_k, len(clubs)))
            if not recalled_ids:
                return clubs
            order = {club_id: index for index, club_id in enumerate(recalled_ids)}
            return sorted(clubs, key=lambda c: order.get(c.id, len(clubs) + c.id))
        except Exception:
            return clubs

    def _rules_only(self, rule_matches: list[RuleMatch], club_by_id: dict[int, Club], warning: str) -> dict:
        return {
            "mode": "rules-only",
            "warning": warning,
            "matches": [
                {
                    **_match_base(match),
                    "club": _club_out(club_by_id[match.club_id]),
                    "reason": "；".join(match.evidence) or "满足当前筛选条件",
                }
                for match in rule_matches
            ],
        }

    def _assert_explanation_ids(self, ids: list[int], candidates: list[RuleMatch]) -> None:
        allowed = {c.club_id for c in candidates}
        if len(set(ids)) != len(ids) or len(ids) != len(candidates) or any(i not in allowed for i in ids):
            raise AIError("INVALID_RESPONSE", "Explanation ids do not match candidates", "openai-compat")

    def _provider_info(self) -> dict:
        if not self.provider:
            return {"id": "unconfigured", "model": "none"}
        info = self.provider.get_provider_info()
        return {"id": info.id, "model": info.model}

    def _log_completion(self, use_case: str, result: AICompletion, fallback_used: bool, status: str) -> None:
        self.logger.record({
            "useCase": use_case, "provider": result.provider, "model": result.model, "status": status,
            "durationMs": result.duration_ms, "inputTokens": result.usage.input_tokens,
            "outputTokens": result.usage.output_tokens, "fallbackUsed": fallback_used,
        })

    def _log_failure(self, use_case: str, error: object, fallback_used: bool) -> None:
        ai_error = error if isinstance(error, AIError) else None
        self.logger.record({
            "useCase": use_case, "provider": ai_error.provider if ai_error else "unknown",
            "model": self._provider_info()["model"], "status": "error", "durationMs": 0,
            "fallbackUsed": fallback_used, "errorCode": ai_error.code if ai_error else "INVALID_RESPONSE",
        })

    def _log_fallback(self, error_code: str) -> None:
        info = self._provider_info()
        self.logger.record({
            "useCase": "recommendation", "provider": info["id"], "model": info["model"],
            "status": "fallback", "durationMs": 0, "fallbackUsed": True, "errorCode": error_code,
        })
