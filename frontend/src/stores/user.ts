import { defineStore } from 'pinia'
import type { UserPreference, MatchResult, ChatMessage } from '@/types'

export const useUserStore = defineStore('user', {
  state: () => ({
    preferences: {
      interests: [] as string[],
      skillLevel: '',
      goals: [] as string[],
    } as UserPreference,
    matchResults: [] as MatchResult[],
    chatHistory: [] as ChatMessage[],
    isMatching: false,
    isChatting: false,
  }),

  getters: {
    hasPreferences: (state) => {
      return (
        state.preferences.interests.length > 0 ||
        state.preferences.skillLevel.length > 0 ||
        state.preferences.goals.length > 0
      )
    },

    lastMatchResults: (state) => {
      return state.matchResults
    },

    lastChatMessage: (state) => {
      return state.chatHistory[state.chatHistory.length - 1]
    },
  },

  actions: {
    setPreferences(preferences: UserPreference) {
      this.preferences = preferences
    },

    updateInterests(interests: string[]) {
      this.preferences.interests = interests
    },

    updateSkillLevel(skillLevel: string) {
      this.preferences.skillLevel = skillLevel
    },

    updateGoals(goals: string[]) {
      this.preferences.goals = goals
    },

    setMatchResults(results: MatchResult[]) {
      this.matchResults = results
    },

    addMatchResult(result: MatchResult) {
      this.matchResults.push(result)
    },

    clearMatchResults() {
      this.matchResults = []
    },

    setMatching(isMatching: boolean) {
      this.isMatching = isMatching
    },

    addChatMessage(message: ChatMessage) {
      this.chatHistory.push(message)
    },

    addAssistantMessage(content: string) {
      this.chatHistory.push({
        role: 'assistant',
        content,
        timestamp: new Date(),
      })
    },

    addUserMessage(content: string) {
      this.chatHistory.push({
        role: 'user',
        content,
        timestamp: new Date(),
      })
    },

    clearChatHistory() {
      this.chatHistory = []
    },

    setChatting(isChatting: boolean) {
      this.isChatting = isChatting
    },

    resetPreferences() {
      this.preferences = {
        interests: [],
        skillLevel: '',
        goals: [],
      }
    },
  },
})
