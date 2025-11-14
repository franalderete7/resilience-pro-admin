import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse } from './types/program'

export interface CreatedProgram {
  program_id: number
  name: string
  description: string | null
  duration_weeks: number
  difficulty_level: string | null
  program_type: string | null
}

export async function createProgramFromLLMResponse(
  userId: string,
  llmResponse: LLMProgramResponse
): Promise<CreatedProgram> {
  const { program, workouts } = llmResponse

  // 1. Create program
  const { data: programData, error: programError } = await supabaseAdmin
    .from('programs')
    .insert({
      name: program.name,
      description: program.description || null,
      duration_weeks: program.duration_weeks,
      difficulty_level: program.difficulty_level || null,
      program_type: program.program_type || null,
      created_by: userId,
    })
    .select()
    .single()

  if (programError || !programData) {
    throw new Error(`Failed to create program: ${programError?.message}`)
  }

  const programId = programData.program_id

  // 2. Create workouts and blocks
  for (const workout of workouts) {
    // Create workout
    const { data: workoutData, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .insert({
        name: workout.name,
        description: workout.description || null,
        estimated_duration_minutes: workout.estimated_duration_minutes || null,
        difficulty_level: workout.difficulty_level || null,
        workout_type: workout.workout_type || null,
        created_by: userId,
      })
      .select()
      .single()

    if (workoutError || !workoutData) {
      throw new Error(`Failed to create workout: ${workoutError?.message}`)
    }

    const workoutId = workoutData.workout_id

    // Link workout to program
    const { error: programWorkoutError } = await supabaseAdmin
      .from('program_workouts')
      .insert({
        program_id: programId,
        workout_id: workoutId,
        week_number: workout.week_number || null,
        day_of_week: workout.day_of_week || null,
        workout_order: workout.workout_order,
      })

    if (programWorkoutError) {
      throw new Error(`Failed to link workout to program: ${programWorkoutError.message}`)
    }

    // Create blocks for this workout
    for (let blockIndex = 0; blockIndex < workout.blocks.length; blockIndex++) {
      const block = workout.blocks[blockIndex]

      // Create block
      const { data: blockData, error: blockError } = await supabaseAdmin
        .from('blocks')
        .insert({
          name: block.name,
          block_type: block.block_type || 'standard',
          sets: block.sets || null,
          rest_between_exercises: block.rest_between_exercises || 60,
          created_by: userId,
        })
        .select()
        .single()

      if (blockError || !blockData) {
        throw new Error(`Failed to create block: ${blockError?.message}`)
      }

      const blockId = blockData.block_id

      // Link block to workout
      const { error: workoutBlockError } = await supabaseAdmin
        .from('workout_blocks')
        .insert({
          workout_id: workoutId,
          block_id: blockId,
          block_order: blockIndex + 1,
        })

      if (workoutBlockError) {
        throw new Error(`Failed to link block to workout: ${workoutBlockError.message}`)
      }

      // Create block_exercises
      // Normalize exercise_order to ensure sequential 1-based indexing (database requires >= 1)
      // Use index + 1 to guarantee sequential ordering starting from 1
      const blockExercises = block.exercises.map((exercise, index) => ({
        block_id: blockId,
        exercise_id: exercise.exercise_id,
        reps: exercise.reps,
        weight_level: exercise.weight_level || null,
        // Always use sequential 1-based indexing (1, 2, 3...) regardless of LLM output
        exercise_order: index + 1,
      }))

      const { error: blockExercisesError } = await supabaseAdmin
        .from('block_exercises')
        .insert(blockExercises)

      if (blockExercisesError) {
        throw new Error(`Failed to create block exercises: ${blockExercisesError.message}`)
      }
    }
  }

  return {
    program_id: programId,
    name: programData.name,
    description: programData.description,
    duration_weeks: programData.duration_weeks,
    difficulty_level: programData.difficulty_level,
    program_type: programData.program_type,
  }
}

