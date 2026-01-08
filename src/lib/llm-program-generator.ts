import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse, UserData, ProgramRequirements } from './types/program'
import { buildSystemPrompt, buildUserPrompt } from './prompts/program-generation'
import { PROGRAM_CONFIG } from './constants/exercise-categories'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/**
 * Fetches all available exercises from the database for the LLM to use.
 */
async function fetchAvailableExercises() {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select('exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed')

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`)
  }

  return data || []
}

/**
 * Generates a personalized training program using the LLM.
 * 
 * The program follows the Resilience Pro methodology:
 * - 4 weeks duration
 * - 3 workouts per week
 * - 6 blocks per workout (Activación 1-2, Bloques 1-4)
 * 
 * @param userData - User profile and preferences
 * @param programRequirements - Optional specific requirements for the program
 * @param previousError - Optional error message from previous attempt for retry feedback
 * @returns The generated program structure from the LLM
 */
export async function generateProgramWithLLM(
  userData: UserData,
  programRequirements?: ProgramRequirements,
  previousError?: string
): Promise<LLMProgramResponse> {
  const exercises = await fetchAvailableExercises()

  if (exercises.length === 0) {
    throw new Error('No exercises available in database')
  }

  const systemPrompt = buildSystemPrompt()
  let userPrompt = buildUserPrompt(userData, programRequirements, exercises)

  // Add feedback from previous attempt if this is a retry
  if (previousError) {
    userPrompt += `\n\n⚠️ CORRECCIÓN REQUERIDA - INTENTO ANTERIOR FALLÓ:\n${previousError}\n\nPor favor, corrige estos errores y asegúrate de generar exactamente ${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts (${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} por semana × ${PROGRAM_CONFIG.DURATION_WEEKS} semanas).`
  }

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.8,
    max_tokens: 8000, // Increased for 4-week programs
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    throw new Error('Empty response from LLM')
  }

  try {
    const parsed = JSON.parse(responseText)
    const program = parsed as LLMProgramResponse

    // Enforce program duration
    program.program.duration_weeks = PROGRAM_CONFIG.DURATION_WEEKS

    return program
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`)
  }
}
