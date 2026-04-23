/**
 * 共享类型定义
 */

// 响应类型
export interface ApiResponse<T> {
  data: T
  message: string
  code: number
}

// 分页类型
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 表单状态
export interface FormState<T> {
  data: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  submitting: boolean
}

// 加载状态
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingStateWith<T> {
  state: LoadingState
  data: T | null
  error: string | null
}

// 标签操作类型
export type TagAction = 'add' | 'remove'

export interface TagOperation {
  action: TagAction
  tag: string
}

// 模态框类型
export interface ModalState<T> {
  isOpen: boolean
  data: T | null
  mode: 'create' | 'edit' | 'view'
}

// 筛选状态
export type TabState = string

export interface TabOption {
  id: string
  label: string
  icon: string
  disabled?: boolean
}

// 统计数据
export interface StatCard {
  id: string
  label: string
  value: number | string
  icon: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
}
