"""向量检索评测：多标签标注集上算 Precision / Recall / MAP / nDCG。

用法（在 backend/ 下，需配置 AI_API_KEY 且 RAG_ENABLED=true）：
    python -m scripts.eval_retrieval

标注集为人工标注的指示性基准（判据：具备该意图的学生会认为该社团相关），
含多个同类社团的重叠 query，使 Precision 指标有意义。
"""
from __future__ import annotations

import asyncio
import math

from app.config import settings
from app.data.ensure_demo_data import ensure_demo_data
from app.data.ensure_vector_index import ensure_vector_index
from app.db import Club, SessionLocal, init_db
from app.services.vector_retrieval import create_vector_retrieval

# query -> 全部相关社团集合（多标签人工标注）
GOLD: list[tuple[str, set[str]]] = [
    # —— A. 明确意图（应该稳定命中）——
    ("对人工智能和大模型很感兴趣", {"人工智能社团"}),
    ("想参与真实开源项目、给社区提交代码", {"开源软件协会"}),
    ("想做数据分析和数据可视化", {"数据科学俱乐部"}),
    ("喜欢硬件，想动手做机器人", {"机器人社团"}),
    ("想自己做一款游戏", {"游戏开发社"}),
    ("喜欢打游戏、参加电竞比赛", {"电竞社"}),
    ("对网络安全和 CTF 感兴趣", {"网络安全社团"}),
    ("想认真练篮球", {"篮球协会"}),
    ("想踢足球、参加校际联赛", {"足球协会"}),
    ("喜欢跑步、想跑马拉松", {"跑步协会"}),
    ("想学游泳", {"游泳协会"}),
    ("想练武术和散打", {"武术协会"}),
    ("喜欢拍照、想学摄影", {"摄影协会"}),
    ("想学一门乐器、弹唱", {"吉他社"}),
    ("喜欢唱歌、想参加合唱", {"合唱团"}),
    ("喜欢跳舞、街舞民族舞都想学", {"舞蹈协会"}),
    ("喜欢戏剧、想上台演话剧", {"话剧社"}),
    ("想练书法、写毛笔字", {"书法社"}),
    ("二次元爱好者，喜欢 cosplay", {"动漫社"}),
    ("想参加数学建模竞赛", {"数学建模协会"}),
    ("对创业和商业计划感兴趣", {"创业社"}),
    ("关注环保和可持续生活", {"环保社团"}),
    ("喜欢天文、想观星", {"天文社"}),
    ("想玩桌游、剧本杀", {"桌游社"}),
    ("想练英语口语、准备出国", {"英语角"}),
    ("想锻炼口才和逻辑、参加辩论", {"辩论社"}),
    # —— B. 同类重叠（多标签，需把同类都排到前面）——
    ("喜欢球拍类运动", {"羽毛球协会", "乒乓球协会"}),
    ("喜欢团队球类、想打比赛", {"篮球协会", "足球协会"}),
    ("想学编程、写代码打基础", {"编程俱乐部", "开源软件协会"}),
    ("喜欢音乐", {"吉他社", "合唱团"}),
    ("对传统文化感兴趣", {"书法社", "武术协会"}),
    ("想做公益、参加志愿服务", {"志愿者协会", "环保社团"}),
    # —— C. 模糊 / 跨类 / 带约束（真实场景里最难，语义锚点弱，允许召回不完美）——
    ("想找个轻松、不太占时间的社团", {"书法社", "英语角", "桌游社", "环保社团", "天文社"}),
    ("想找对以后找工作求职有帮助的社团", {"编程俱乐部", "数据科学俱乐部", "人工智能社团", "开源软件协会", "创业社"}),
    ("想强身健体、减肥塑形", {"跑步协会", "游泳协会", "篮球协会", "足球协会", "羽毛球协会", "乒乓球协会", "武术协会", "舞蹈协会"}),
    ("想认识更多朋友、扩展社交圈", {"桌游社", "英语角", "动漫社", "电竞社"}),
    ("想锻炼领导力和组织协调能力", {"创业社", "志愿者协会", "辩论社"}),
    ("想变得更自信、敢在人前表达", {"辩论社", "话剧社", "英语角"}),
    ("喜欢画画、想提升绘画", {"动漫社", "书法社"}),
    ("喜欢科技、爱动手做东西", {"机器人社团", "编程俱乐部", "游戏开发社"}),
    ("喜欢竞技、有胜负欲想拿名次", {"电竞社", "数学建模协会", "辩论社"}),
    ("喜欢舞台表演、想登台演出", {"话剧社", "舞蹈协会", "合唱团"}),
]


def precision_at_k(ranked, relevant, k):
    return len([x for x in ranked[:k] if x in relevant]) / k


def recall_at_k(ranked, relevant, k):
    return len([x for x in ranked[:k] if x in relevant]) / len(relevant)


def average_precision(ranked, relevant):
    hits, score = 0, 0.0
    for i, x in enumerate(ranked, 1):
        if x in relevant:
            hits += 1
            score += hits / i
    return score / len(relevant) if relevant else 0.0


def ndcg_at_k(ranked, relevant, k):
    dcg = sum(1 / math.log2(i + 1) for i, x in enumerate(ranked[:k], 1) if x in relevant)
    idcg = sum(1 / math.log2(i + 1) for i in range(1, min(len(relevant), k) + 1))
    return dcg / idcg if idcg else 0.0


async def main() -> None:
    if not settings.AI_API_KEY:
        raise SystemExit("需要配置 AI_API_KEY 且 RAG_ENABLED=true 才能评测")
    init_db()
    ensure_demo_data(True)
    n_docs = await ensure_vector_index(enabled=True, api_key=settings.AI_API_KEY, force=True)

    with SessionLocal() as s:
        name_by_id = {c.id: c.name for c in s.query(Club).all()}
    n_clubs = len(name_by_id)
    retr = create_vector_retrieval()
    await retr.retrieve_club_ids("预热", 5)

    agg = {"P@3": 0.0, "R@3": 0.0, "P@5": 0.0, "R@5": 0.0, "P@R": 0.0, "MAP": 0.0, "nDCG@5": 0.0}
    imperfect = []
    for query, relevant in GOLD:
        ids = await retr.retrieve_club_ids(query, n_clubs)
        ranked = [name_by_id.get(i) for i in ids]
        pr = precision_at_k(ranked, relevant, len(relevant))
        ap = average_precision(ranked, relevant)
        agg["P@3"] += precision_at_k(ranked, relevant, 3)
        agg["R@3"] += recall_at_k(ranked, relevant, 3)
        agg["P@5"] += precision_at_k(ranked, relevant, 5)
        agg["R@5"] += recall_at_k(ranked, relevant, 5)
        agg["P@R"] += pr
        agg["MAP"] += ap
        agg["nDCG@5"] += ndcg_at_k(ranked, relevant, 5)
        if ap < 0.999:
            top = ranked[:max(len(relevant) + 2, 3)]
            imperfect.append((query, ap, [x for x in top if x in relevant], [x for x in top if x not in relevant]))

    n = len(GOLD)
    print(f"语料：{n_clubs} 个社团 / {n_docs} 条知识块 ｜ 评测集：{n} 条多标签 query\n")
    for k, v in agg.items():
        print(f"  {k:<8} = {v / n:.3f}")
    if imperfect:
        print(f"\n未达满分的 query（{len(imperfect)}/{n}，AP<1，多为模糊/跨类）：")
        for q, ap, hit, distract in imperfect:
            print(f"  AP={ap:.2f} | {q[:20]:<20} | 命中={hit} | 混入={distract}")
    print("\n注：P@R（k=每条 query 的相关数）是精确率的公平口径；"
          "当相关社团很少时 P@5 会被分母压低，属指标假象而非排序错误。")


if __name__ == "__main__":
    asyncio.run(main())
