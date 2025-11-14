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
    // Ensure estimated_duration_minutes is > 0 if provided
    const estimatedDuration = workout.estimated_duration_minutes !== null && workout.estimated_duration_minutes !== undefined
      ? Math.max(1, Math.floor(workout.estimated_duration_minutes))
      : null
    
    const { data: workoutData, error: workoutError } = await supabaseAdmin
      .from('workouts')
      .insert({
        name: workout.name,
        description: workout.description || null,
        estimated_duration_minutes: estimatedDuration,
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
    // Ensure workout_order >= 1, week_number >= 1 if provided, day_of_week 1-7 if provided
    const workoutOrder = Math.max(1, Math.floor(workout.workout_order))
    const weekNumber = workout.week_number !== null && workout.week_number !== undefined
      ? Math.max(1, Math.floor(workout.week_number))
      : null
    const dayOfWeek = workout.day_of_week !== null && workout.day_of_week !== undefined
      ? Math.max(1, Math.min(7, Math.floor(workout.day_of_week)))
      : null
    
    const { error: programWorkoutError } = await supabaseAdmin
      .from('program_workouts')
      .insert({
        program_id: programId,
        workout_id: workoutId,
        week_number: weekNumber,
        day_of_week: dayOfWeek,
        workout_order: workoutOrder,
      })

    if (programWorkoutError) {
      throw new Error(`Failed to link workout to program: ${programWorkoutError.message}`)
    }

    // Create blocks for this workout
    for (let blockIndex = 0; blockIndex < workout.blocks.length; blockIndex++) {
      const block = workout.blocks[blockIndex]

      // Create block
      // Ensure sets is > 0 if provided, rest_between_exercises >= 0
      const blockSets = block.sets !== null && block.sets !== undefined 
        ? Math.max(1, Math.floor(block.sets)) 
        : null
      const restBetweenExercises = Math.max(0, Math.floor(block.rest_between_exercises || 60))
      
      const { data: blockData, error: blockError } = await supabaseAdmin
        .from('blocks')
        .insert({
          name: block.name,
          block_type: block.block_type || 'standard',
          sets: blockSets,
          rest_between_exercises: restBetweenExercises,
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
      // All values should already be normalized, but add final safety checks
      const blockExercises = block.exercises.map((exercise, index) => {
        // Final safety checks - ensure all values meet database constraints
        const exerciseOrder = Math.max(1, Math.floor(exercise.exercise_order || index + 1))
        const reps = Math.max(1, Math.floor(exercise.reps || 10)) // Default to 10 if invalid
        const exerciseId = Math.floor(exercise.exercise_id)
        
        // Validate critical fields
        if (exerciseOrder < 1) {
          throw new Error(`Invalid exercise_order: ${exerciseOrder}. Must be >= 1.`)
        }
        if (reps < 1) {
          throw new Error(`Invalid reps: ${reps}. Must be >= 1.`)
        }
        if (!exerciseId || exerciseId < 1) {
          throw new Error(`Invalid exercise_id: ${exerciseId}. Must be a positive integer.`)
        }
        
        return {
          block_id: blockId,
          exercise_id: exerciseId,
          reps: reps,
          weight_level: exercise.weight_level || null,
          exercise_order: exerciseOrder,
        }
      })

      const { error: blockExercisesError, data: insertedData } = await supabaseAdmin
        .from('block_exercises')
        .insert(blockExercises)
        .select()

      if (blockExercisesError) {
        // Log detailed error information for debugging
        console.error('Supabase block_exercises insert error:', {
          error: blockExercisesError,
          blockExercises: blockExercises.map(ex => ({
            block_id: ex.block_id,
            exercise_id: ex.exercise_id,
            reps: ex.reps,
            exercise_order: ex.exercise_order,
            weight_level: ex.weight_level,
          })),
        })
        throw new Error(`Failed to create block exercises: ${blockExercisesError.message}. Details: ${JSON.stringify(blockExercisesError)}`)
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

