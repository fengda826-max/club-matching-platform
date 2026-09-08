// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Backend base URL
export const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const result = await response.json() as ApiResponse<T>
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.error || `Request failed with ${response.status}`)
  }
  return result.data
}

const get = <T>(endpoint: string) => request<T>(endpoint)
const post = <T>(endpoint: string, body?: unknown) => request<T>(endpoint, {
  method: 'POST',
  body: JSON.stringify(body),
})
const put = <T>(endpoint: string, body?: unknown) => request<T>(endpoint, {
  method: 'PUT',
  body: JSON.stringify(body),
})
const del = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' })

// Club types (matches backend)
export type Club = {
  id: number
  name: string
  category: string
  description: string
  requirements: string
  memberCount: number
  contact: string
  tags: string
  createdAt: string
  updatedAt: string
}

export type MatchResultItem = {
  clubId: number
  clubName: string
  matchScore: number
  matchReason: string
}

export type MatchResult = {
  matches: MatchResultItem[]
}

export type UserPreference = {
  interests: string[]
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  goals: string[]
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type Statistics = {
  totalClubs: number
  totalMembers: number
  categories: Array<{
    category: string
    count: number
  }>
}

// API client
export const apiClient = {
  // Health check - root health just returns status
  health: () => get<{status: string, message: string}>('/health'),

  // Club endpoints
  clubs: {
    getAll: () => get<Club[]>('/clubs'),
    getById: (id: number) => get<Club>(`/clubs/${id}`),
    create: (data: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>) => post<Club>('/clubs', data),
    update: (id: number, data: Partial<Club>) => put<Club>(`/clubs/${id}`, data),
    delete: (id: number) => del<Club>(`/clubs/${id}`),
    search: (keyword: string) => get<Club[]>(`/clubs/search/${keyword}`),
    filterByCategory: (category: string) => get<Club[]>(`/clubs/category/${category}`),
    getAllTags: () => get<string[]>('/clubs/tags/all'),
    getStatistics: () => get<Statistics>('/clubs/statistics/summary'),
  },

  // AI endpoints
  ai: {
    health: () => get<{healthy: boolean, provider: any}>('/ai/health'),
    matching: (preferences: UserPreference) => post<MatchResult>('/ai/matching', {preferences}),
    chat: (message: string, history: ChatMessage[]) => post<{response: string}>('/ai/chat', {message, history}),
    generateDescription: (name: string, category: string) => post<{description: string}>('/ai/generate-description', {name, category}),
    suggestTags: (name: string, category: string, description: string) => post<string[]>('/ai/suggest-tags', {name, category, description}),
  },
}

export default apiClient
