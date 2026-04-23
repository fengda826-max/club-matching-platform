/**
 * Services Layer
 * Unified export for all services
 */

// API Client
export * from './apiClient'
export {
  ApiError,
  anthropicClient,
  withApiHandling,
  hasValidApiKey,
  getApiKeyStatus,
} from './apiClient'

// AI Service
export * from './aiService'
export {
  generateRecommendations,
  chatWithAI,
  generateDescription,
} from './aiService'
export type {
  RecommendationRequest,
  RecommendationResponse,
  ChatRequest,
  ChatResponse,
  DescriptionGenerationRequest,
  DescriptionGenerationResponse,
} from './aiService'

// Club Service
export * from './clubService'
export {
  initializeClubStore,
  getAllClubs,
  getClubById,
  addClub,
  updateClub,
  deleteClub,
  getFilteredClubs,
  getAllTags,
  getClubsByCategory,
  getFeaturedClubs,
  getAllCategories,
  getCategoryById,
  getTotalMemberCount,
  getClubsByCategoryName,
  searchClubs,
} from './clubService'
export type { ClubFilters } from './clubService'
