import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, rateLimitErrorResponse, handleRouteError } from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/exercises/[id]
 *
 * Deletes an exercise by ID. Uses service role to bypass RLS.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { success, remaining, reset } = await rateLimit(_request)
    if (!success) {
      return rateLimitErrorResponse(reset)
    }

    const { id } = await params
    const exerciseId = parseInt(id, 10)

    if (isNaN(exerciseId)) {
      return errorResponse('Invalid exercise ID', 400)
    }

    logger.info('Deleting exercise', { exerciseId })

    const { error } = await supabaseAdmin
      .from('exercises')
      .delete()
      .eq('exercise_id', exerciseId)

    if (error) {
      logger.error('Failed to delete exercise', { exerciseId, error })
      return errorResponse(error.message, 500, error)
    }

    logger.info('Exercise deleted successfully', { exerciseId })

    const response = NextResponse.json({ success: true })
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return response
  } catch (error) {
    return handleRouteError(error)
  }
}
