export interface Club {
  id: string
  name: string
  category: string
  tags: string[]
  description: string
  requirements: string
  memberCount: Count
  contact: string
  images?: string[]
  aiGenerated?: boolean
}

export interface UserPreference {
  interests: string[]
  skillLevel: string
  // timeCommitment: string
  goals: string[]
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
}

export interface ClubCategory {
  id: string
  name: string
  icon: string
}

export type Count = string | number
