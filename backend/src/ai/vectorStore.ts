import path from 'path'
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { env } from '../lib/env'

/**
 * 一段可检索的社团知识块（embedding 之前的原始文本）。
 */
export type ClubDoc = {
  clubId: number
  section: string
  content: string
}

/**
 * KNN 命中结果：带回 clubId / 段落 / 原文 / 余弦距离（越小越相关）。
 */
export type VectorHit = {
  clubId: number
  section: string
  content: string
  distance: number
}

const TABLE = 'club_doc_vectors'

/**
 * 把 Prisma 的 `file:./dev.db` 形式解析成 better-sqlite3 能用的绝对路径。
 * Prisma 以 schema 所在目录（prisma/）为基准解析相对路径，这里保持一致。
 */
function resolveDbPath(): string {
  const url = env.DATABASE_URL
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url
  if (path.isAbsolute(raw)) return raw
  return path.resolve(__dirname, '../../prisma', raw)
}

/**
 * sqlite-vec 向量存储：与 Prisma 共用同一个 SQLite 文件，但用独立的
 * better-sqlite3 连接管理 vec0 虚拟表（Prisma 无法加载 SQLite 扩展）。
 *
 * 绑定要点（踩过的坑）：
 * - embedding 以 JSON 字符串传入（`[0.1, ...]`），不要传 Float32Array。
 * - 整数辅助列（clubId）必须以 BigInt 绑定，否则 better-sqlite3 会当作
 *   FLOAT 传给 sqlite-vec，报 "Auxiliary column type mismatch"。
 */
export class SqliteVecStore {
  private db: Database.Database
  private readonly dim: number

  constructor(dim: number = env.AI_EMBEDDING_DIM) {
    this.dim = dim
    this.db = new Database(resolveDbPath())
    sqliteVec.load(this.db)
    this.db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLE} USING vec0(` +
      `embedding float[${this.dim}], +clubId integer, +section text, +content text)`,
    )
  }

  /**
   * 用向量重建整张表（先清空后批量写入），保证幂等。
   * @param docs 知识块
   * @param vectors 与 docs 一一对应的向量
   */
  indexDocuments(docs: ClubDoc[], vectors: number[][]): void {
    if (docs.length !== vectors.length) {
      throw new Error('docs and vectors length mismatch')
    }
    const insert = this.db.prepare(
      `INSERT INTO ${TABLE}(embedding, clubId, section, content) VALUES (?, ?, ?, ?)`,
    )
    const rebuild = this.db.transaction(() => {
      this.db.exec(`DELETE FROM ${TABLE}`)
      docs.forEach((doc, i) => {
        insert.run(JSON.stringify(vectors[i]), BigInt(doc.clubId), doc.section, doc.content)
      })
    })
    rebuild()
  }

  /**
   * KNN 检索：返回最相关的 k 个知识块（按距离升序）。
   */
  search(queryVector: number[], k: number): VectorHit[] {
    const rows = this.db.prepare(
      `SELECT clubId, section, content, distance FROM ${TABLE} ` +
      `WHERE embedding MATCH ? ORDER BY distance LIMIT ?`,
    ).all(JSON.stringify(queryVector), k) as Array<{ clubId: number | bigint; section: string; content: string; distance: number }>
    return rows.map(row => ({
      clubId: Number(row.clubId),
      section: row.section,
      content: row.content,
      distance: row.distance,
    }))
  }

  isEmpty(): boolean {
    const row = this.db.prepare(`SELECT count(*) AS c FROM ${TABLE}`).get() as { c: number | bigint }
    return Number(row.c) === 0
  }

  count(): number {
    const row = this.db.prepare(`SELECT count(*) AS c FROM ${TABLE}`).get() as { c: number | bigint }
    return Number(row.c)
  }

  close(): void {
    this.db.close()
  }
}
