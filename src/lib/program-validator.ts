import type { LLMProgramResponse } from './types/program'
import {
  BLOCK_TYPES,
  DIFFICULTY_LEVELS,
  WEIGHT_LEVELS,
  PROGRAM_CONFIG,
} from './constants/exercise-categories'

const VALID_BLOCK_TYPES = [...BLOCK_TYPES]
const VALID_DIFFICULTY_LEVELS = DIFFICULTY_LEVELS.map((d) => d.value)
const VALID_WEIGHT_LEVELS = [...WEIGHT_LEVELS]

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

  if (program.duration_weeks !== PROGRAM_CONFIG.DURATION_WEEKS) {
    return {
      valid: false,
      error: `Program duration_weeks must be exactly ${PROGRAM_CONFIG.DURATION_WEEKS}`,
    }
  }

  if (program.difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(program.difficulty_level)) {
    return { valid: false, error: `Invalid difficulty_level: ${program.difficulty_level}` }
  }

  // Validate workouts
  if (workouts.length === 0) {
    return { valid: false, error: 'At least one workout is required' }
  }

  // Validate expected number of workouts (4 weeks × 3 per week = 12)
  if (workouts.length !== PROGRAM_CONFIG.TOTAL_WORKOUTS) {
    // Count workouts per week to provide detailed feedback
    const workoutsPerWeek: Record<number, number> = {}
    workouts.forEach((workout) => {
      const week = workout.week_number || 0
      workoutsPerWeek[week] = (workoutsPerWeek[week] || 0) + 1
    })
    
    const weekBreakdown = Object.entries(workoutsPerWeek)
      .map(([week, count]) => `Semana ${week}: ${count} workouts`)
      .join(', ')
    
    return {
      valid: false,
      error: `Expected exactly ${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts (${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} per week × ${PROGRAM_CONFIG.DURATION_WEEKS} weeks), got ${workouts.length}. Breakdown: ${weekBreakdown || 'No week_number specified'}. Each week MUST have exactly ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} workouts.`,
    }
  }
  
  // Validate that each week has exactly 3 workouts
  const workoutsPerWeek: Record<number, number> = {}
  workouts.forEach((workout) => {
    const week = workout.week_number || 0
    workoutsPerWeek[week] = (workoutsPerWeek[week] || 0) + 1
  })
  
  for (let week = 1; week <= PROGRAM_CONFIG.DURATION_WEEKS; week++) {
    const count = workoutsPerWeek[week] || 0
    if (count !== PROGRAM_CONFIG.WORKOUTS_PER_WEEK) {
      return {
        valid: false,
        error: `Week ${week} has ${count} workouts, but must have exactly ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} workouts. Each week MUST have exactly ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} workouts.`,
      }
    }
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

    // Validate week_number for 4-week program
    if (
      workout.week_number &&
      (workout.week_number < 1 || workout.week_number > PROGRAM_CONFIG.DURATION_WEEKS)
    ) {
      return {
        valid: false,
        error: `week_number must be between 1 and ${PROGRAM_CONFIG.DURATION_WEEKS}`,
      }
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

      // Note: sets will be normalized if invalid, just check it's a number if provided
      if (block.sets !== undefined && block.sets !== null && typeof block.sets !== 'number') {
        return { valid: false, error: 'Block sets must be a number' }
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

        // Note: All numeric values are normalized before validation
        // Just check they exist and are numbers - normalization handles constraints
        if (typeof exercise.reps !== 'number') {
          return { valid: false, error: 'Exercise reps must be a number' }
        }

        if (typeof exercise.exercise_order !== 'number') {
          return { valid: false, error: 'Exercise exercise_order must be a number' }
        }

        if (exercise.weight_level && !VALID_WEIGHT_LEVELS.includes(exercise.weight_level)) {
          return { valid: false, error: `Invalid weight_level: ${exercise.weight_level}` }
        }
      }
    }
  }

  return { valid: true, data: response as LLMProgramResponse }
}
