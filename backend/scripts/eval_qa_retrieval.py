"""知识库问答检索评测：评 retrieve_passages（段落级 RAG 召回）。

区别于 eval_retrieval.py（社团级、给匹配用）：这里 query 是**问句**，
召回单位是**知识块（社团·章节）**，判据是"有没有召回到能回答该问题的
社团及章节"。对应线上 POST /api/ai/chat/stream 的 grounding 与 sources。

用法（在 backend/ 下，需 AI_API_KEY 且 RAG_ENABLED=true）：
    python -m scripts.eval_qa_retrieval
"""
from __future__ import annotations

import asyncio

from app.config import settings
from app.data.ensure_demo_data import ensure_demo_data
from app.data.ensure_vector_index import ensure_vector_index
from app.db import Club, SessionLocal, init_db
from app.services.vector_retrieval import create_vector_retrieval

# 问句 -> (正确社团, 能回答该问题的章节集合)
# 章节：详细介绍/活动安排/入社流程/常见问答/往期活动/适合人群/培养收获
QA_GOLD: list[tuple[str, str, set[str]]] = [
    ("编程俱乐部要交会费吗？", "编程俱乐部", {"入社流程", "常见问答"}),
    ("摄影协会一般什么时候活动？", "摄影协会", {"活动安排"}),
    ("人工智能社团需要什么基础？", "人工智能社团", {"入社流程", "常见问答", "适合人群"}),
    ("篮球协会女生能参加吗？", "篮球协会", {"常见问答"}),
    ("吉他社没有吉他能学吗？", "吉他社", {"常见问答", "入社流程"}),
    ("网络安全社团会教怎么攻击别人吗？", "网络安全社团", {"常见问答"}),
    ("游泳协会旱鸭子能学会吗？", "游泳协会", {"常见问答", "适合人群"}),
    ("话剧社没演过戏能加入吗？", "话剧社", {"常见问答", "入社流程"}),
    ("机器人社团会不会很烧钱？", "机器人社团", {"常见问答", "入社流程"}),
    ("数学建模只会数学不会编程行吗？", "数学建模协会", {"常见问答"}),
    ("英语角口语很差能参加吗？", "英语角", {"常见问答", "适合人群"}),
    ("辩论社内向的人适合吗？", "辩论社", {"常见问答", "适合人群"}),
    ("跑步协会早上几点开始跑？", "跑步协会", {"活动安排"}),
    ("合唱团五音不全能加入吗？", "合唱团", {"常见问答"}),
    ("书法社需要买很多工具吗？", "书法社", {"常见问答", "入社流程"}),
    ("电竞社会不会影响学习？", "电竞社", {"常见问答"}),
    ("志愿者协会时间不固定能参加吗？", "志愿者协会", {"常见问答", "活动安排"}),
    ("创业社没有创业经验能来吗？", "创业社", {"常见问答", "适合人群"}),
    ("动漫社不会画画能加入吗？", "动漫社", {"常见问答"}),
    ("游戏开发社只会画画不会编程能来吗？", "游戏开发社", {"常见问答"}),
    ("羽毛球协会要自己带球拍吗？", "羽毛球协会", {"常见问答"}),
    ("天文社在城里能看到星星吗？", "天文社", {"常见问答"}),
    ("桌游社一个人去会不会尴尬？", "桌游社", {"常见问答"}),
    ("武术协会训练容易受伤吗？", "武术协会", {"常见问答"}),
    ("开源软件协会英语不好能贡献吗？", "开源软件协会", {"常见问答"}),
    ("参加编程俱乐部能学到什么？", "编程俱乐部", {"培养收获"}),
    ("什么样的人适合加入摄影协会？", "摄影协会", {"适合人群"}),
    ("数据科学俱乐部和人工智能社团有什么区别？", "数据科学俱乐部", {"常见问答"}),
    ("足球协会没有球队经验能加入吗？", "足球协会", {"常见问答"}),
    ("环保社团会很占时间吗？", "环保社团", {"常见问答"}),
    # 不点名社团、弱语义信号的问句（社团检索更难，真实场景常见）
    ("有没有适合零基础学摄影的社团？", "摄影协会", {"适合人群", "入社流程", "详细介绍"}),
    ("哪个社团能帮我练英语口语？", "英语角", {"详细介绍", "适合人群"}),
    ("想找个能打 CTF 的社团", "网络安全社团", {"详细介绍", "适合人群"}),
    ("想学做网站和网页开发去哪个社团？", "编程俱乐部", {"详细介绍", "常见问答"}),
    ("想找个安静能静下心来的社团", "书法社", {"适合人群", "详细介绍"}),
    ("哪个社团能帮我准备商业路演比赛？", "创业社", {"详细介绍", "培养收获"}),
    ("想学做游戏的策划和美术", "游戏开发社", {"详细介绍", "适合人群"}),
    ("有没有能提升团队协作能力的技术类社团？", "开源软件协会", {"详细介绍", "培养收获"}),
]


async def main() -> None:
    if not settings.AI_API_KEY:
        raise SystemExit("需要配置 AI_API_KEY 且 RAG_ENABLED=true 才能评测")
    init_db()
    ensure_demo_data(True)
    n_docs = await ensure_vector_index(enabled=True, api_key=settings.AI_API_KEY, force=True)
    with SessionLocal() as s:
        name_by_id = {c.id: c.name for c in s.query(Club).all()}
    retr = create_vector_retrieval()
    await retr.retrieve_passages("预热", 5)

    club_hit1 = club_r5 = sec_hit3 = sec_hit5 = mrr = 0.0
    misses = []
    for q, club, sections in QA_GOLD:
        hits = await retr.retrieve_passages(q, 5)  # 内部返回 max(k*3,k)=15，按距离升序
        passages = [(name_by_id.get(h.club_id), h.section) for h in hits]

        club_hit1 += 1.0 if passages and passages[0][0] == club else 0.0
        club_r5 += 1.0 if any(c == club for c, _ in passages[:5]) else 0.0
        sec_hit3 += 1.0 if any(c == club and sec in sections for c, sec in passages[:3]) else 0.0
        sec_hit5 += 1.0 if any(c == club and sec in sections for c, sec in passages[:5]) else 0.0

        rank = next((i for i, (c, sec) in enumerate(passages, 1) if c == club and sec in sections), 0)
        mrr += (1.0 / rank) if rank else 0.0
        if rank != 1:
            misses.append((q, club, rank, passages[:3]))

    n = len(QA_GOLD)
    print(f"语料：{len(name_by_id)} 社团 / {n_docs} 知识块 ｜ 问答评测集：{n} 条问句\n")
    print(f"  社团 Hit@1（首个段落即正确社团）   = {club_hit1 / n:.3f}")
    print(f"  社团 Recall@5（正确社团进前5段落）  = {club_r5 / n:.3f}")
    print(f"  章节 Hit@3（答案章节进前3段落）     = {sec_hit3 / n:.3f}")
    print(f"  章节 Hit@5（答案章节进前5段落）     = {sec_hit5 / n:.3f}")
    print(f"  段落 MRR（首个'正确社团+答案章节'）  = {mrr / n:.3f}")
    if misses:
        print(f"\n答案章节未排第一的问句（{len(misses)}/{n}）：")
        for q, club, rank, top3 in misses:
            print(f"  rank={rank or '-'} | {q[:20]:<20} | 期望={club} | top3={top3}")


if __name__ == "__main__":
    asyncio.run(main())
