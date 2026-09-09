export interface Club {
  id: number
  name: string
  category: string
  tags: string[]
  description: string
  requirements: string
  memberCount: number
  contact: string
  activityTime: string
  weeklyHours: number
  campus: string
  fee: number
  skillRequirement: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  isRecruiting: boolean
  images?: string[]
  aiGenerated?: boolean
}

export interface UserPreference {
  interests: string[]
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  goals: string[]
  availableTimes: string[]
  campus?: string
  maxWeeklyHours?: number
  maxFee?: number
}

export interface MatchResult {
  club: Club
  score: number
  reasons: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{ clubId: number; name: string }>
  model?: string
  durationMs?: number
  error?: string
}

export interface ClubCategory {
  id: string
  name: string
  icon: string
}
