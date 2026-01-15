import { NextRequest } from 'next/server'
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

    // 3. Parse and validate request body
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

    // 4. Get available exercise IDs for validation from cached API
    let availableExerciseIds: number[] = []
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/exercises?fields=validation`, {
        next: { revalidate: 3600 }
      })
      
      if (res.ok) {
        const exercises = await res.json()
        availableExerciseIds = exercises?.map((e: any) => e.exercise_id) || []
      }
    } catch (error) {
      console.warn('API fetch failed, falling back to direct DB query')
    }
    
    // Fallback to direct DB query if API fails
    if (availableExerciseIds.length === 0) {
      const { data: exercises, error: exercisesError } = await supabaseAdmin
        .from('exercises')
        .select('exercise_id')

      if (exercisesError) {
        return NextResponse.json(
          { error: 'Failed to fetch exercises' },
          { status: 500 }
        )
      }

      availableExerciseIds = exercises?.map((e) => e.exercise_id) || []
    }

    if (availableExerciseIds.length === 0) {
      logger.error('No exercises available in database')
      return errorResponse('No exercises available in database', 400)
    }

    // 5. Generate program with LLM with retry mechanism
    const MAX_RETRIES = 3
    let llmResponse: any = null
    let normalizedResponse: any = null
    let validation: { valid: boolean; error?: string; data?: any } | null = null
    let lastError: string | undefined = undefined

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Generate program with LLM (include previous error feedback if retrying)
        llmResponse = await generateProgramWithLLM(
          body.userData,
          body.programRequirements,
          lastError
        )

        // Normalize ALL numeric fields to ensure database constraints are met
        normalizedResponse = normalizeProgramData(llmResponse)

        // Validate LLM response
        validation = await validateLLMResponse(normalizedResponse, availableExerciseIds)

        if (validation.valid && validation.data) {
          // Validation passed! Break out of retry loop
          break
        } else {
          // Validation failed - store error for retry feedback
          lastError = validation.error || 'Invalid program structure'
          
          // If this is the last attempt, we'll return the error below
          if (attempt === MAX_RETRIES) {
            console.warn(`Program generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`)
            break
          }
          
          // Wait a bit before retrying (exponential backoff)
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
          throw error // Re-throw on last attempt
        }
        
        logger.error(`Program generation attempt ${attempt} threw error`, { 
          userId: user.id,
          attempt,
          error 
        })
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    // Check if we have a valid program after all retries
    if (!validation || !validation.valid || !validation.data) {
      // After all retries failed, return a user-friendly error
      return NextResponse.json(
        { 
          error: 'Unable to generate a valid program. Please try again in a moment.',
          details: lastError // Include details for debugging (can be removed in production)
        },
        { status: 500 }
      )
    }

    // 6. Create program in database
    logger.info('Creating program in database', { userId: user.id })
    const createdProgram = await createProgramFromLLMResponse(user.id, validation.data)

    logger.info('Program created successfully', { 
      userId: user.id,
      programId: createdProgram.program_id 
    })

    const response = successResponse({ 
      program_id: createdProgram.program_id,
      program: createdProgram 
    }, 201)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    
    return response
  } catch (error) {
    return handleRouteError(error)
  }
}

