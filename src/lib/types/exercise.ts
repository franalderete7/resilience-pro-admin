/**
 * Shared Exercise Types
 * 
 * Centralized type definitions for exercises across the app.
 * These types match the Supabase database schema.
 */

export interface Exercise {
  exercise_id: number
  name: string
  description: string | null
  video_url: string | null
  image_url: string | null
  category: string | null
  muscle_groups: string[] | null
  equipment_needed: string[] | null
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExerciseMinimal {
  exercise_id: number
  name: string
  category: string | null
  difficulty_level: string | null
  image_url: string | null
}

export interface ExerciseLLM {
  exercise_id: number
  name: string
  category: string | null
  muscle_groups: string[] | null
  difficulty_level: string | null
  equipment_needed: string[] | null
}

export interface ExerciseValidation {
  exercise_id: number
}

export interface CreateExerciseInput {
  name: string
  description?: string | null
  video_url?: string | null
  image_url?: string | null
  category?: string | null
  muscle_groups?: string[] | null
  equipment_needed?: string[] | null
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | null
  created_by: string
}

export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {
  exercise_id: number
}
