/**
 * Environment Configuration
 * 
 * Validates and exports environment variables.
 * Fails fast if required variables are missing.
 */

import { envSchema } from '../validation/schemas'
import { logger } from '../logger'

function validateEnv() {
  const env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  }

  try {
    return envSchema.parse(env)
  } catch (error: any) {
    logger.error('Environment validation failed:', error.errors)
    throw new Error(
      `Missing or invalid environment variables:\n${error.errors
        .map((e: any) => `  - ${e.path.join('.')}: ${e.message}`)
        .join('\n')}`
    )
  }
}

// Validate on module load
export const env = validateEnv()

// Export individual variables for convenience
export const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY,
  GOOGLE_AI_API_KEY,
  NEXT_PUBLIC_APP_URL,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
} = env
