/**
 * API Response Utilities
 * 
 * Standardized response helpers for API routes.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '../logger'
import type { ApiResponse, ApiError, ApiValidationError } from '../types/api'

/**
 * Success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Error response
 */
export function errorResponse(
  error: string,
  status = 500,
  details?: any
): NextResponse<ApiError> {
  logger.error('API Error:', { error, status, details })
  
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  )
}

/**
 * Validation error response (from Zod)
 */
export function validationErrorResponse(
  zodError: ZodError
): NextResponse<ApiValidationError> {
  const errors = zodError.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))

  logger.warn('Validation Error:', errors)

  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors,
    },
    { status: 400 }
  )
}

/**
 * Rate limit error response
 */
export function rateLimitErrorResponse(
  reset: number
): NextResponse<ApiError> {
  const resetDate = new Date(reset)
  
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      details: {
        resetAt: resetDate.toISOString(),
      },
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(reset),
      }
    }
  )
}

/**
 * Unauthorized error response
 */
export function unauthorizedResponse(
  message = 'Unauthorized'
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  )
}

/**
 * Not found error response
 */
export function notFoundResponse(
  resource = 'Resource'
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`,
    },
    { status: 404 }
  )
}

/**
 * Handle async route errors
 */
export async function handleRouteError(error: unknown): Promise<NextResponse<ApiError>> {
  if (error instanceof ZodError) {
    return validationErrorResponse(error)
  }

  if (error instanceof Error) {
    logger.error('Route error:', error)
    return errorResponse(error.message, 500)
  }

  logger.error('Unknown route error:', error)
  return errorResponse('Internal server error', 500)
}
