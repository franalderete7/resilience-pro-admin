import type { LLMProgramResponse } from './types/program'
import { PROGRAM_CONFIG } from './constants/exercise-categories'

/**
 * Normalizes all numeric fields in the LLM response to ensure they meet database constraints.
 * This prevents validation errors from Supabase by ensuring all values are valid before insertion.
 */
export function normalizeProgramData(data: LLMProgramResponse): LLMProgramResponse {
  // Normalize program duration_weeks (must be > 0, enforce 4 weeks)
  data.program.duration_weeks = PROGRAM_CONFIG.DURATION_WEEKS

  // Normalize workouts
  data.workouts.forEach((workout, workoutIndex) => {
    // Normalize workout_order (must be >= 1)
    if (typeof workout.workout_order !== 'number' || workout.workout_order < 1) {
      workout.workout_order = workoutIndex + 1
    } else {
      workout.workout_order = Math.max(1, Math.floor(workout.workout_order))
    }

    // Normalize estimated_duration_minutes (must be > 0 if not null)
    if (workout.estimated_duration_minutes !== null && workout.estimated_duration_minutes !== undefined) {
      workout.estimated_duration_minutes = Math.max(1, Math.floor(workout.estimated_duration_minutes))
    }

    // Normalize week_number (must be >= 1 and <= DURATION_WEEKS if provided)
    if (workout.week_number !== null && workout.week_number !== undefined) {
      workout.week_number = Math.max(1, Math.min(PROGRAM_CONFIG.DURATION_WEEKS, Math.floor(workout.week_number)))
    }

    // Normalize day_of_week (must be 1-7 if provided)
    if (workout.day_of_week !== null && workout.day_of_week !== undefined) {
      workout.day_of_week = Math.max(1, Math.min(7, Math.floor(workout.day_of_week)))
    }

    // Normalize blocks
    workout.blocks.forEach((block, blockIndex) => {
      // Normalize sets (must be > 0 if provided)
      if (block.sets !== null && block.sets !== undefined) {
        block.sets = Math.max(1, Math.floor(block.sets))
      }

      // Normalize rest_between_exercises (must be >= 0, default 60)
      if (block.rest_between_exercises !== null && block.rest_between_exercises !== undefined) {
        block.rest_between_exercises = Math.max(0, Math.floor(block.rest_between_exercises))
      } else {
        block.rest_between_exercises = 60 // Default value
      }

      // Normalize exercises - handle case where LLM returns just IDs instead of objects
      block.exercises = block.exercises.map((exercise, exerciseIndex) => {
        // If exercise is just a number (exercise_id), convert to proper object
        if (typeof exercise === 'number') {
          return {
            exercise_id: Math.floor(exercise),
            reps: 10, // Default reps
            exercise_order: exerciseIndex + 1,
            weight_level: undefined,
          }
        }
        
        // If exercise is a string (exercise_id as string), convert to proper object
        if (typeof exercise === 'string') {
          return {
            exercise_id: parseInt(exercise, 10),
            reps: 10, // Default reps
            exercise_order: exerciseIndex + 1,
            weight_level: undefined,
          }
        }

        // It's an object - normalize it
        // Normalize exercise_order (must be >= 1) - always use sequential indexing
        exercise.exercise_order = exerciseIndex + 1

        // Normalize reps (must be > 0)
        if (typeof exercise.reps !== 'number' || exercise.reps < 1) {
          // Default reps based on fitness level or use minimum of 1
          exercise.reps = Math.max(1, Math.floor(exercise.reps || 10))
        } else {
          exercise.reps = Math.max(1, Math.floor(exercise.reps))
        }

        // Ensure exercise_id is an integer (LLM sometimes returns it as a string)
        if (typeof exercise.exercise_id === 'string') {
          exercise.exercise_id = parseInt(exercise.exercise_id, 10)
        }
        if (typeof exercise.exercise_id === 'number') {
          exercise.exercise_id = Math.floor(exercise.exercise_id)
        }

        return exercise
      })
    })
  })

  return data
}
