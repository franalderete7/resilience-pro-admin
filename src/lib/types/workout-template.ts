/**
 * TypeScript types for the workout_templates JSONB-based structure.
 * These types match the actual SQL schema created by the migration scripts.
 */

// ─── Enums ───────────────────────────────────────────────────────

export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type TemplateStatus = 'draft' | 'active' | 'archived'
export type BlockType = 'warmup' | 'main' | 'cooldown' | 'superset' | 'circuit' | 'standard'
export type WeightLevel = 'no_weight' | 'light' | 'medium' | 'heavy'

// ─── JSONB Structure (stored in workout_templates.structure) ─────

/**
 * Exercise within a block in the JSONB structure
 */
export interface TemplateExercise {
  exercise_order: number
  exercise_id: number
  reps: string            // "10", "10-12", "AMRAP", etc.
  weight_level: WeightLevel
  rest_seconds: number
  notes?: string
}

/**
 * Block within a workout in the JSONB structure
 */
export interface TemplateBlock {
  block_order: number
  name: string
  block_type: BlockType
  sets: number
  rest_between_exercises_seconds: number
  exercises: TemplateExercise[]
}

/**
 * Workout within a week in the JSONB structure
 */
export interface TemplateWorkout {
  workout_order: number
  day_of_week: number     // 1-7, Monday = 1
  name: string
  estimated_duration_minutes: number
  blocks: TemplateBlock[]
}

/**
 * Week within the program structure
 */
export interface TemplateWeek {
  week_number: number
  workouts: TemplateWorkout[]
}

/**
 * Complete JSONB structure stored in workout_templates.structure
 */
export interface WorkoutStructure {
  version: '1.0'
  weeks: TemplateWeek[]
}

// ─── AI Output Contract ─────────────────────────────────────────

/**
 * AI Program Output — what the program service builds after
 * transforming the raw LLM response into the JSONB structure.
 */
export interface AIProgramOutput {
  name: string
  description?: string
  duration_weeks: number
  difficulty_level: ProgramDifficulty
  program_type: string
  estimated_session_minutes: number
  structure: WorkoutStructure
}

// ─── Database Row Types ─────────────────────────────────────────

/**
 * workout_templates table row
 */
export interface WorkoutTemplate {
  id: string
  name: string
  description: string | null
  structure: WorkoutStructure
  duration_weeks: number
  difficulty_level: ProgramDifficulty | null
  program_type: string | null
  estimated_session_minutes: number | null
  created_by: string
  status: TemplateStatus
  version: number
  created_at: string
  updated_at: string
}

/**
 * user_programs table row
 */
export interface UserProgram {
  id: string
  user_id: string
  template_id: string
  current_week: number
  current_workout: number
  is_active: boolean
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * workout_completions table row
 */
export interface WorkoutCompletion {
  id: string
  user_program_id: string
  week_number: number
  workout_order: number
  block_order: number
  exercise_order: number
  completed_at: string
  actual_reps: string | null
  actual_weight_kg: number | null
  actual_weight_level: WeightLevel | null
  duration_seconds: number | null
  notes: string | null
}

// ─── Insert Types ───────────────────────────────────────────────

export type WorkoutTemplateInsert = Omit<
  WorkoutTemplate,
  'id' | 'created_at' | 'updated_at' | 'version' | 'status'
> & {
  version?: number
  status?: TemplateStatus
}

export type UserProgramInsert = Omit<
  UserProgram,
  'id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at'
> & {
  started_at?: string
  completed_at?: string | null
}

export type WorkoutCompletionInsert = Omit<
  WorkoutCompletion,
  'id' | 'completed_at'
> & {
  completed_at?: string
}
