import type { Club } from '@prisma/client'
import type { RuleMatch, UserPreference } from '../schemas/matching'

const skillRank = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 } as const

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN')
}

function uniqueMatches(values: string[], searchable: string): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(value =>
    value.length > 0 && searchable.includes(normalize(value)),
  )))
}

function overlapScore(matches: number, requested: number, maximum: number): number {
  if (requested === 0) return Math.round(maximum / 2)
  return Math.round((matches / requested) * maximum)
}

function timeMatches(availableTime: string, activityTime: string): boolean {
  const requested = normalize(availableTime)
  const actual = normalize(activityTime)
  if (requested === '周末') return actual.includes('周六') || actual.includes('周日')
  if (requested === '工作日') return ['周一', '周二', '周三', '周四', '周五'].some(day => actual.includes(day))
  return actual.includes(requested)
}

export class RuleMatchingService {
  match(preference: UserPreference, clubs: Club[]): RuleMatch[] {
    return clubs
      .filter(club => this.passesHardConstraints(preference, club))
      .map(club => this.scoreClub(preference, club))
      .sort((left, right) => right.score - left.score || left.clubId - right.clubId)
  }

  private passesHardConstraints(preference: UserPreference, club: Club): boolean {
    if (!club.isRecruiting) return false
    if (preference.maxFee !== undefined && club.fee > preference.maxFee) return false
    if (preference.maxWeeklyHours !== undefined && club.weeklyHours > preference.maxWeeklyHours) return false
    if (preference.campus && club.campus !== '全校区' && normalize(club.campus) !== normalize(preference.campus)) return false
    if (preference.availableTimes.length > 0 && !preference.availableTimes.some(time => timeMatches(time, club.activityTime))) return false

    const userSkill = skillRank[preference.skillLevel]
    const requiredSkill = skillRank[club.skillRequirement as keyof typeof skillRank]
    if (requiredSkill === undefined || userSkill < requiredSkill) return false
    return true
  }

  private scoreClub(preference: UserPreference, club: Club): RuleMatch {
    const searchable = normalize([
      club.name,
      club.category,
      club.tags,
      club.description,
      club.requirements,
    ].join(' '))
    const interests = uniqueMatches(preference.interests, searchable)
    const goals = uniqueMatches(preference.goals, searchable)
    const dimensions = {
      interest: overlapScore(interests.length, preference.interests.length, 40),
      goal: overlapScore(goals.length, preference.goals.length, 25),
      schedule: preference.availableTimes.length > 0 ? 20 : 10,
      skill: 15,
    }
    const score = Math.max(0, Math.min(100, Object.values(dimensions).reduce((sum, value) => sum + value, 0)))
    const evidence: string[] = []
    if (interests.length) evidence.push(`兴趣：${interests.join('、')}`)
    if (goals.length) evidence.push(`目标：${goals.join('、')}`)
    if (preference.availableTimes.length) evidence.push(`时间：${club.activityTime}`)
    evidence.push(`门槛：${club.skillRequirement}`)

    const caveats: string[] = []
    if (club.fee > 0) caveats.push(`费用约 ${club.fee} 元`)
    if (club.weeklyHours > 0) caveats.push(`每周约需投入 ${club.weeklyHours} 小时`)

    return { clubId: club.id, score, dimensions, evidence, caveats }
  }
}
