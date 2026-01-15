import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { generateProgramWithLLM } from '@/lib/llm-program-generator'
import { validateLLMResponse } from '@/lib/program-validator'
import { createProgramFromLLMResponse } from '@/lib/program-service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeProgramData } from '@/lib/normalize-program-data'

interface RequestBody {
  userData: {
    fitness_level: 'beginner' | 'intermediate' | 'advanced'
    goals: string[]
    gender?: string
    height?: number
    weight?: number
    weight_goal?: number
    preferences?: {
      available_equipment?: string[]
      workout_days_per_week?: number
      preferred_duration_minutes?: number
    }
  }
  programRequirements?: {
    duration_weeks?: number
    focus?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate request
    const { error: authError, user } = await authenticateRequest(request)

    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body: RequestBody = await request.json()

    if (!body.userData || !body.userData.fitness_level || !body.userData.goals) {
      return NextResponse.json(
        { error: 'Missing required fields: userData.fitness_level and userData.goals' },
        { status: 400 }
      )
    }

    // 3. Get available exercise IDs for validation from cached API
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
      return NextResponse.json(
        { error: 'No exercises available in database' },
        { status: 400 }
      )
    }

    // 4. Generate program with LLM with retry mechanism
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
          console.log(`Program generation attempt ${attempt} failed. Retrying... Error: ${lastError}`)
        }
      } catch (error: any) {
        lastError = error.message || 'Failed to generate program'
        
        if (attempt === MAX_RETRIES) {
          throw error // Re-throw on last attempt
        }
        
        console.error(`Program generation attempt ${attempt} threw error:`, error)
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
    const createdProgram = await createProgramFromLLMResponse(user.id, validation.data)

    return NextResponse.json(
      {
        success: true,
        program_id: createdProgram.program_id,
        program: createdProgram,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating program:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

