import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { generateProgramWithLLM } from '@/lib/llm-program-generator'
import { validateLLMResponse } from '@/lib/program-validator'
import { createProgramFromLLMResponse } from '@/lib/program-service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeProgramData } from '@/lib/normalize-program-data'
import { createProgramSchema } from '@/lib/validation/schemas'
import { rateLimitExpensive } from '@/lib/rate-limit'
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse,
  validationErrorResponse,
  rateLimitErrorResponse,
  handleRouteError 
} from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate request
    const { error: authError, user } = await authenticateRequest(request)

    if (authError || !user) {
      logger.warn('Unauthorized program creation attempt', { error: authError })
      return unauthorizedResponse(authError || 'Unauthorized')
    }

    // 2. Rate limiting (expensive operation - multiple LLM calls)
    const { success, remaining, reset } = await rateLimitExpensive(request, user.id)
    if (!success) {
      logger.warn('Rate limit exceeded for program creation', { userId: user.id })
      return rateLimitErrorResponse(reset)
    }

    // 3. Check if user is premium - skip limit check for premium users
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (userError) {
      logger.error('Failed to check user premium status', { userId: user.id, error: userError })
      return errorResponse('Failed to verify user status', 500)
    }

    // Only check program limit for non-premium users
    if (!dbUser?.is_premium) {
      const { count: programCount, error: countError } = await supabaseAdmin
        .from('user_programs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) {
        logger.error('Failed to check program count', { userId: user.id, error: countError })
        return errorResponse('Failed to check program limit', 500)
      }

      if ((programCount ?? 0) >= 1) {
        return errorResponse(
          'Has alcanzado el límite de 1 programa gratuito. Actualiza a Premium para crear más.',
          403
        )
      }
    }

    // 4. Parse and validate request body
    const body = await request.json()
    const validationResult = createProgramSchema.safeParse(body)
    
    if (!validationResult.success) {
      logger.warn('Invalid program creation request', { 
        userId: user.id,
        errors: validationResult.error.issues 
      })
      return validationErrorResponse(validationResult.error)
    }

    const { userData, programRequirements } = validationResult.data
    
    logger.info('Starting program generation', { 
      userId: user.id,
      fitnessLevel: userData.fitness_level,
      goals: userData.goals 
    })

    // 5. Get available exercise IDs for validation
    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('exercise_id')

    if (exercisesError) {
      logger.error('Failed to fetch exercises from Supabase', { error: exercisesError })
      return errorResponse('Failed to fetch exercises', 500)
    }

    const availableExerciseIds = exercises?.map((e) => e.exercise_id) || []

    if (availableExerciseIds.length === 0) {
      logger.error('No exercises available in database')
      return errorResponse('No exercises available in database', 400)
    }

    // 6. Generate program with LLM with retry mechanism
    const MAX_RETRIES = 3
    let llmResponse: any = null
    let normalizedResponse: any = null
    let validation: { valid: boolean; error?: string; data?: any } | null = null
    let lastError: string | undefined = undefined

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        llmResponse = await generateProgramWithLLM(
          body.userData,
          body.programRequirements,
          lastError
        )

        normalizedResponse = normalizeProgramData(llmResponse)

        validation = await validateLLMResponse(normalizedResponse, availableExerciseIds)

        if (validation.valid && validation.data) {
          break
        } else {
          lastError = validation.error || 'Invalid program structure'
          
          if (attempt === MAX_RETRIES) {
            console.warn(`Program generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`)
            break
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          logger.warn(`Program generation attempt ${attempt} failed. Retrying...`, { 
            userId: user.id,
            attempt,
            error: lastError 
          })
        }
      } catch (error: any) {
        lastError = error.message || 'Failed to generate program'
        
        if (attempt === MAX_RETRIES) {
          throw error
        }
        
        logger.error(`Program generation attempt ${attempt} threw error`, { 
          userId: user.id,
          attempt,
          error 
        })
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    if (!validation || !validation.valid || !validation.data) {
      return NextResponse.json(
        { 
          error: 'Unable to generate a valid program. Please try again in a moment.',
          details: lastError
        },
        { status: 500 }
      )
    }

    // 7. Create workout template + user_program in database
    logger.info('Creating workout template in database', { userId: user.id })
    const createdProgram = await createProgramFromLLMResponse(user.id, validation.data)

    logger.info('Program created successfully', { 
      userId: user.id,
      templateId: createdProgram.template_id,
      userProgramId: createdProgram.user_program_id,
    })

    const response = successResponse({ 
      template_id: createdProgram.template_id,
      user_program_id: createdProgram.user_program_id,
      program: createdProgram,
    }, 201)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    
    return response
  } catch (error) {
    return handleRouteError(error)
  }
}
