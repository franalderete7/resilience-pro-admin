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

    // 3. Get available exercise IDs for validation
    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('exercise_id')

    if (exercisesError) {
      return NextResponse.json(
        { error: 'Failed to fetch exercises' },
        { status: 500 }
      )
    }

    const availableExerciseIds = exercises?.map((e) => e.exercise_id) || []

    if (availableExerciseIds.length === 0) {
      return NextResponse.json(
        { error: 'No exercises available in database' },
        { status: 400 }
      )
    }

    // 4. Generate program with LLM
    const llmResponse = await generateProgramWithLLM(
      body.userData,
      body.programRequirements
    )

    // 4.5. Normalize ALL numeric fields to ensure database constraints are met
    // This prevents validation errors from Supabase (reps >= 1, sets > 0, etc.)
    const normalizedResponse = normalizeProgramData(llmResponse)

    // 5. Validate LLM response
    const validation = await validateLLMResponse(normalizedResponse, availableExerciseIds)

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'Invalid program structure from LLM' },
        { status: 400 }
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

