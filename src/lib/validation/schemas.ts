/**
 * Zod Validation Schemas
 * 
 * Centralized validation schemas for API requests and data.
 */

import { z } from 'zod'

// Exercise Schemas
export const createExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().nullable().optional(),
  video_url: z.string().url('Invalid URL').nullable().optional(),
  image_url: z.string().url('Invalid URL').nullable().optional(),
  category: z.string().nullable().optional(),
  muscle_groups: z.array(z.string()).nullable().optional(),
  equipment_needed: z.array(z.string()).nullable().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
})

export const analyzeExerciseSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
})

// Program Generation Schemas
export const createProgramSchema = z.object({
  userData: z.object({
    fitness_level: z.enum(['beginner', 'intermediate', 'advanced'], {
      message: 'Fitness level is required',
    }),
    goals: z.array(z.string()).min(1, 'At least one goal is required'),
    gender: z.string().optional(),
    height: z.number().positive().optional(),
    weight: z.number().positive().optional(),
    weight_goal: z.number().positive().optional(),
    preferences: z.object({
      available_equipment: z.array(z.string()).optional(),
      workout_days_per_week: z.number().int().min(1).max(7).optional(),
      preferred_duration_minutes: z.number().int().min(15).max(180).optional(),
    }).optional(),
  }),
  programRequirements: z.object({
    duration_weeks: z.number().int().positive().optional(),
    focus: z.string().optional(),
  }).optional(),
})

// Prompt Version Schemas
export const savePromptSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  methodology: z.string(),
  categories: z.string(),
  rules: z.string(),
  structure: z.string(),
})

// Environment Variables Schema
export const envSchema = z.object({
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  GROQ_API_KEY: z.string().min(1, 'Groq API key is required'), // Used for program generation and analyze-exercise
  GOOGLE_AI_API_KEY: z.string().optional(), // No longer required (was used for program generation)
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>
export type AnalyzeExerciseInput = z.infer<typeof analyzeExerciseSchema>
export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type SavePromptInput = z.infer<typeof savePromptSchema>
export type EnvConfig = z.infer<typeof envSchema>
