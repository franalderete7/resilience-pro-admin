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

export interface UserData {
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

export interface ProgramRequirements {
  duration_weeks?: number
  focus?: string
}

