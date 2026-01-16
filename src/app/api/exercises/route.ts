import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, rateLimitErrorResponse, handleRouteError } from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'
import type { Exercise, ExerciseMinimal, ExerciseLLM, ExerciseValidation } from '@/lib/types/exercise'

// Force dynamic rendering (uses request headers for rate limiting)
export const dynamic = 'force-dynamic'

// Cache for 1 hour
export const revalidate = 3600

/**
 * GET /api/exercises
 * 
 * Fetches exercises with optional field selection for optimized payloads.
 * 
 * Query params:
 * - fields: 'minimal' | 'full' | 'llm' | 'validation' (default: 'minimal')
 * 
 * Rate limit: 10 requests per minute
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { success, remaining, reset } = await rateLimit(request)
    if (!success) {
      return rateLimitErrorResponse(reset)
    }

    const { searchParams } = new URL(request.url)
    const fields = searchParams.get('fields') || 'minimal'
    
    // Define field sets based on use case
    const fieldSets: Record<string, string> = {
      // For UI grid display (no heavy fields)
      minimal: 'exercise_id, name, category, difficulty_level, image_url',
      
      // For exercise detail modal
      full: '*',
      
      // For LLM program generation
      llm: 'exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed',
      
      // For validation only
      validation: 'exercise_id'
    }
    
    const selectFields = fieldSets[fields] || fieldSets.minimal
    
    logger.debug('Fetching exercises', { fields, selectFields })
    
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select(selectFields)
      .order('created_at', { ascending: false })
    
    if (error || !data) {
      logger.error('Error fetching exercises from Supabase:', error)
      return errorResponse('Failed to fetch exercises', 500, error)
    }
    
    // Type-safe response based on field selection
    let typedData: Exercise[] | ExerciseMinimal[] | ExerciseLLM[] | ExerciseValidation[]
    
    switch (fields) {
      case 'minimal':
        typedData = data as unknown as ExerciseMinimal[]
        break
      case 'llm':
        typedData = data as unknown as ExerciseLLM[]
        break
      case 'validation':
        typedData = data as unknown as ExerciseValidation[]
        break
      default:
        typedData = data as unknown as Exercise[]
    }
    
    // Return data directly (not wrapped) for backward compatibility
    const response = NextResponse.json(typedData)
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    
    return response
  } catch (error) {
    return handleRouteError(error)
  }
}
