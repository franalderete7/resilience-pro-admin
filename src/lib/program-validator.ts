import type { LLMProgramResponse } from './llm-program-generator'

const VALID_BLOCK_TYPES = ['warmup', 'main', 'cooldown', 'superset', 'circuit', 'standard']
const VALID_DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']
const VALID_WEIGHT_LEVELS = ['no_weight', 'light', 'medium', 'heavy']

export interface LLMProgramResponse {
  program: {
    name: string
    description?: string
    duration_weeks: number
    difficulty_level?: string
    program_type?: string
  }
  workouts: Array<{
    name: string
    description?: string
    estimated_duration_minutes?: number
    difficulty_level?: string
    workout_type?: string
    week_number?: number
    day_of_week?: number
    workout_order: number
    blocks: Array<{
      name: string
      block_type?: string
      sets?: number
      rest_between_exercises?: number
      exercises: Array<{
        exercise_id: number
        reps: number
        weight_level?: string
        exercise_order: number
      }>
    }>
  }>
}

export async function validateLLMResponse(
  response: any,
  availableExerciseIds: number[]
): Promise<{ valid: boolean; error?: string; data?: LLMProgramResponse }> {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Invalid response format' }
  }

  if (!response.program || !response.workouts || !Array.isArray(response.workouts)) {
    return { valid: false, error: 'Missing program or workouts array' }
  }

  const { program, workouts } = response

  // Validate program
  if (!program.name || typeof program.name !== 'string') {
    return { valid: false, error: 'Program name is required' }
  }

  if (!program.duration_weeks || program.duration_weeks < 1) {
    return { valid: false, error: 'Program duration_weeks must be at least 1' }
  }

  if (program.difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(program.difficulty_level)) {
    return { valid: false, error: `Invalid difficulty_level: ${program.difficulty_level}` }
  }

  // Validate workouts
  if (workouts.length === 0) {
    return { valid: false, error: 'At least one workout is required' }
  }

  for (const workout of workouts) {
    if (!workout.name || typeof workout.name !== 'string') {
      return { valid: false, error: 'Workout name is required' }
    }

    if (typeof workout.workout_order !== 'number' || workout.workout_order < 1) {
      return { valid: false, error: 'Workout workout_order must be >= 1' }
    }

    if (workout.difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(workout.difficulty_level)) {
      return { valid: false, error: `Invalid workout difficulty_level: ${workout.difficulty_level}` }
    }

    if (workout.day_of_week && (workout.day_of_week < 1 || workout.day_of_week > 7)) {
      return { valid: false, error: 'day_of_week must be between 1 and 7' }
    }

    // Validate blocks
    if (!workout.blocks || !Array.isArray(workout.blocks) || workout.blocks.length === 0) {
      return { valid: false, error: 'Each workout must have at least one block' }
    }

    for (const block of workout.blocks) {
      if (!block.name || typeof block.name !== 'string') {
        return { valid: false, error: 'Block name is required' }
      }

      if (block.block_type && !VALID_BLOCK_TYPES.includes(block.block_type)) {
        return { valid: false, error: `Invalid block_type: ${block.block_type}` }
      }

      if (block.sets !== undefined && block.sets < 1) {
        return { valid: false, error: 'Block sets must be >= 1' }
      }

      if (!block.exercises || !Array.isArray(block.exercises) || block.exercises.length === 0) {
        return { valid: false, error: 'Each block must have at least one exercise' }
      }

      // Validate exercises
      for (const exercise of block.exercises) {
        if (typeof exercise.exercise_id !== 'number') {
          return { valid: false, error: 'Exercise exercise_id must be a number' }
        }

        if (!availableExerciseIds.includes(exercise.exercise_id)) {
          return {
            valid: false,
            error: `Exercise ID ${exercise.exercise_id} does not exist in database`,
          }
        }

        if (typeof exercise.reps !== 'number' || exercise.reps < 1) {
          return { valid: false, error: 'Exercise reps must be >= 1' }
        }

        if (typeof exercise.exercise_order !== 'number' || exercise.exercise_order < 1) {
          return { valid: false, error: 'Exercise exercise_order must be >= 1' }
        }

        if (exercise.weight_level && !VALID_WEIGHT_LEVELS.includes(exercise.weight_level)) {
          return { valid: false, error: `Invalid weight_level: ${exercise.weight_level}` }
        }
      }
    }
  }

  return { valid: true, data: response as LLMProgramResponse }
}

