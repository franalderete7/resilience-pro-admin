import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse } from './types/program'
import type {
  WorkoutStructure,
  TemplateWeek,
  TemplateWorkout,
  TemplateBlock,
  TemplateExercise,
  WorkoutTemplate,
  UserProgram,
  BlockType,
  WeightLevel,
} from './types/workout-template'

export interface CreatedProgram {
  template_id: string
  user_program_id: string
  name: string
  description: string | null
  duration_weeks: number
  difficulty_level: string | null
  program_type: string | null
}

/**
 * Transforms the flat LLM response into the nested WorkoutStructure JSONB format,
 * then inserts a single row into workout_templates + a user_programs row.
 *
 * Old flow: 6 tables, 100+ inserts
 * New flow: 1 workout_templates row + 1 user_programs row = 2 inserts
 */
export async function createProgramFromLLMResponse(
  userId: string,
  llmResponse: LLMProgramResponse
): Promise<CreatedProgram> {
  const { program, workouts } = llmResponse

  // ── 1. Transform flat workouts array into nested WorkoutStructure ──

  // Group workouts by week_number
  const weekMap = new Map<number, typeof workouts>()

  for (const workout of workouts) {
    const weekNum = workout.week_number ?? 1
    if (!weekMap.has(weekNum)) {
      weekMap.set(weekNum, [])
    }
    weekMap.get(weekNum)!.push(workout)
  }

  // Build the weeks array sorted by week number
  const weeks: TemplateWeek[] = [...weekMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, weekWorkouts]) => ({
      week_number: weekNumber,
      workouts: weekWorkouts
        .sort((a, b) => a.workout_order - b.workout_order)
        .map((w): TemplateWorkout => ({
          workout_order: w.workout_order,
          day_of_week: w.day_of_week ?? 1,
          name: w.name,
          estimated_duration_minutes: w.estimated_duration_minutes ?? 60,
          blocks: (w.blocks || []).map((block, blockIndex): TemplateBlock => ({
            block_order: blockIndex + 1,
            name: block.name,
            block_type: (block.block_type || 'standard') as BlockType,
            sets: block.sets ?? 3,
            rest_between_exercises_seconds: block.rest_between_exercises ?? 60,
            exercises: (block.exercises || []).map((ex, exIndex): TemplateExercise => ({
              exercise_order: ex.exercise_order ?? exIndex + 1,
              exercise_id: typeof ex.exercise_id === 'string'
                ? parseInt(ex.exercise_id as unknown as string, 10)
                : ex.exercise_id,
              reps: String(ex.reps ?? 10),
              weight_level: (ex.weight_level || 'no_weight') as WeightLevel,
              rest_seconds: block.rest_between_exercises ?? 60,
            })),
          })),
        })),
    }))

  const structure: WorkoutStructure = {
    version: '1.0',
    weeks,
  }

  // Calculate average session duration from all workouts
  const allDurations = workouts
    .map(w => w.estimated_duration_minutes)
    .filter((d): d is number => d != null && d > 0)
  const avgSessionMinutes = allDurations.length > 0
    ? Math.round(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length)
    : 60

  // ── 2. Insert into workout_templates ──

  const { data: templateData, error: templateError } = await supabaseAdmin
    .from('workout_templates')
    .insert({
      name: program.name,
      description: program.description || null,
      structure: structure,
      duration_weeks: program.duration_weeks,
      difficulty_level: program.difficulty_level || null,
      program_type: program.program_type || null,
      estimated_session_minutes: avgSessionMinutes,
      created_by: userId,
      status: 'active',
    })
    .select()
    .single()

  if (templateError || !templateData) {
    throw new Error(`Failed to create workout template: ${templateError?.message}`)
  }

  // ── 3. Create user_programs row linking user to the template ──

  const { data: userProgramData, error: userProgramError } = await supabaseAdmin
    .from('user_programs')
    .insert({
      user_id: userId,
      template_id: templateData.id,
      current_week: 1,
      current_workout: 1,
      is_active: true,
    })
    .select()
    .single()

  if (userProgramError || !userProgramData) {
    throw new Error(`Failed to create user program: ${userProgramError?.message}`)
  }

  return {
    template_id: templateData.id,
    user_program_id: userProgramData.id,
    name: templateData.name,
    description: templateData.description,
    duration_weeks: templateData.duration_weeks,
    difficulty_level: templateData.difficulty_level,
    program_type: templateData.program_type,
  }
}
