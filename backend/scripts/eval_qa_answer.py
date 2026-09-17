"""知识库问答**答案准确率**评测（端到端 RAG，非仅检索）。

跑真实的 grounded_chat，用关键词启发式判分（近似，非严格）。分两档：
- 基础题：单一事实 / 防幻觉拒答 —— 小语料下通常很高
- 难题：跨文档比较 / 聚合 —— 朴素“检索 top-k 再回答”的已知短板，
  用来暴露“小而干净的语料会让准确率虚高”这一点。

用法（backend/ 下，需 AI_API_KEY 且 RAG_ENABLED=true）：
    python -m scripts.eval_qa_answer
"""
from __future__ import annotations

import asyncio

from app import deps
from app.config import settings
from app.data.ensure_demo_data import ensure_demo_data
from app.data.ensure_vector_index import ensure_vector_index
from app.db import init_db

# (问题, 答对需命中的关键词——all 全部命中, 是否应拒答)
BASIC = [
    ("编程俱乐部要交会费吗？", ["免", "不收", "不用交", "免费"], False),
    ("摄影协会的会费是多少？", ["100"], False),
    ("网络安全社团会教怎么攻击别人吗？", ["不"], False),
    ("篮球协会女生可以参加吗？", ["可以"], False),
    ("跑步协会一般几点开始活动？", ["7", "早"], False),  # 命中其一即可（见下 any 逻辑）
    ("编程俱乐部有奖学金吗？", ["未说明", "没有", "未提", "资料", "不清楚"], True),
    ("摄影协会包住宿吗？", ["未说明", "没有", "未提", "资料", "不清楚"], True),
]

# 跨文档比较 / 聚合：需要同时看多个社团的资料才能答对，朴素 RAG 易错
HARD = [
    ("羽毛球协会和乒乓球协会的会费分别是多少？", ["60", "40"], False),          # 需两个数都对
    ("所有技术类社团里，哪个会费最贵？", ["机器人"], False),                    # 机器人 100
    ("哪个体育类社团是免费的、不收会费？", ["跑步"], False),                    # 跑步 0
    ("哪个社团每周需要投入的时间最多？", ["机器人", "数学建模"], False),         # 各 6 小时（命中其一）
    ("游泳协会和跑步协会，哪个会费更贵？", ["游泳"], False),                    # 150 > 0
    ("篮球、足球、羽毛球里，哪个会费最低？", ["篮球", "足球", "50"], False),      # 篮/足 50 < 羽 60
    ("人工智能社团和数据科学俱乐部的主要区别是什么？", ["数据", "模型"], False),  # 需对比两者定位
]


def judge(ans: str, keywords: list[str], all_required: bool) -> bool:
    if all_required:
        return all(k in ans for k in keywords)
    return any(k in ans for k in keywords)


async def run(cases, ai, clubs, all_required_default=False):
    ok, total, wrong = 0, 0, []
    for item in cases:
        q, kws, refuse = item
        grounded = await ai.grounded_chat(q, [], clubs)
        ans = ""
        async for t in grounded["stream"]:
            ans += t
        # 事实题：多关键词=全部命中(数值类)；拒答题：命中任一“未说明”措辞
        need_all = refuse is False and len(kws) >= 2 and all(any(c.isdigit() for c in k) for k in kws)
        hit = judge(ans, kws, need_all) if not refuse else any(k in ans for k in kws)
        total += 1
        ok += 1 if hit else 0
        if not hit:
            wrong.append((q, ans[:70].replace("\n", " ")))
    return ok, total, wrong


async def main() -> None:
    if not settings.AI_API_KEY:
        raise SystemExit("需要配置 AI_API_KEY 且 RAG_ENABLED=true 才能评测")
    init_db()
    ensure_demo_data(True)
    await ensure_vector_index(enabled=True, api_key=settings.AI_API_KEY, force=True)
    await deps._init()
    ai = deps._ai_service
    clubs = deps.club_service.get_all_clubs()

    b_ok, b_n, b_wrong = await run(BASIC, ai, clubs)
    h_ok, h_n, h_wrong = await run(HARD, ai, clubs)

    print(f"基础题（单一事实/防幻觉）: {b_ok}/{b_n} = {b_ok/b_n:.0%}")
    print(f"难题（跨文档比较/聚合）  : {h_ok}/{h_n} = {h_ok/h_n:.0%}")
    print(f"综合                     : {(b_ok+h_ok)}/{(b_n+h_n)} = {(b_ok+h_ok)/(b_n+h_n):.0%}")
    if b_wrong or h_wrong:
        print("\n未通过：")
        for q, a in b_wrong + h_wrong:
            print(f"  {q}\n     答: {a}")


if __name__ == "__main__":
    asyncio.run(main())
