/**
 * API Response Types
 * 
 * Standardized response types for all API endpoints.
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  success: false
  error: string
  code?: string
  details?: any
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiValidationError extends ApiError {
  errors: ValidationError[]
}
