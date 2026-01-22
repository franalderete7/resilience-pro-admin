import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse, UserData, ProgramRequirements } from './types/program'
import { buildProgramPrompt, getPrimaryGoalLabel } from './prompts/prompt-builder'
import { getActiveGoalPrompts } from './prompts/prompt-service'
import { mapUserGoalsToProgramGoal, GOAL_METADATA } from './prompts/goal-prompts'
import { PROGRAM_CONFIG } from './constants/exercise-categories'
import { env } from './config/env'
import { logger } from './logger'

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
})

/**
 * Fetches all available exercises directly from the database for the LLM to use.
 * Uses the 'llm' field set which includes only fields needed for program generation.
 * 
 * Note: We use direct DB access here since this runs server-side and we have
 * admin access. The API endpoint is for client-side use.
 */
async function fetchAvailableExercises() {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select('exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`)
  }

  return data || []
}

/**
 * Builds a compact exercise list string for the prompt.
 */
function buildExercisesList(exercises: Array<{
  exercise_id: number
  name: string
  category?: string | null
  muscle_groups?: string[] | null
  difficulty_level?: string | null
}>) {
  return exercises
    .map((e) => `${e.exercise_id}:${e.name}|${e.category || ''}|${e.muscle_groups?.join(',') || ''}|${e.difficulty_level || ''}`)
    .join('\n')
}

/**
 * Generates workouts for a single week.
 */
async function generateWeekWorkouts(
  weekNumber: number,
  userData: UserData,
  programRequirements: ProgramRequirements | undefined,
  exercises: Array<{
    exercise_id: number
    name: string
    category?: string | null
    muscle_groups?: string[] | null
    difficulty_level?: string | null
  }>,
  systemPrompt: string,
  previousWeeksContext: string
): Promise<Array<any>> {
  const exercisesList = buildExercisesList(exercises)
  const workoutOrderStart = (weekNumber - 1) * PROGRAM_CONFIG.WORKOUTS_PER_WEEK + 1
  const workoutOrderEnd = weekNumber * PROGRAM_CONFIG.WORKOUTS_PER_WEEK

  // Phase description based on week number (Semanas 1-2: Base, Semanas 3-4: Intensificación)
  const phaseDescription = weekNumber <= 2 
    ? 'FASE BASE: menor volumen, énfasis en técnica y adaptación' 
    : 'FASE INTENSIFICACIÓN: mayor volumen e intensidad'

  const weekPrompt = `GENERA SOLO LA SEMANA ${weekNumber} DE ${PROGRAM_CONFIG.DURATION_WEEKS}

PERFIL DEL USUARIO:
- Nivel: ${userData.fitness_level}
- Objetivos: ${userData.goals.join(', ')}
- Duración por sesión: ${userData.preferences?.preferred_duration_minutes || 60} min

${previousWeeksContext ? `CONTEXTO DE SEMANAS ANTERIORES (para progresión):\n${previousWeeksContext}\n` : ''}

REQUISITOS PARA SEMANA ${weekNumber}:
- Genera EXACTAMENTE 3 workouts
- workout_order: ${workoutOrderStart}, ${workoutOrderStart + 1}, ${workoutOrderEnd}
- week_number: ${weekNumber} para todos
- ${phaseDescription}

EJERCICIOS DISPONIBLES (formato: ID:nombre|categoría|músculos|dificultad):
${exercisesList}

NOMENCLATURA OBLIGATORIA:
- Nombres de workout: "Día ${workoutOrderStart}", "Día ${workoutOrderStart + 1}", "Día ${workoutOrderEnd}" (NO usar W1D1, S1D1, etc.)
- Nombres de bloques: "Activación 1", "Activación 2", "Bloque 1", "Bloque 2", "Bloque 3", "Bloque 4"

ESTRUCTURA DE BLOQUES (6 bloques por workout):
1. Activación 1 (warmup): 3-5 ejercicios de mobility and flexibility, 1-2 sets
2. Activación 2 (warmup): 2-3 ejercicios de core/isometrics, 2 sets
3. Bloque 1 (main): 2-3 ejercicios de ballistics/plyometrics/agility/olympic-derivatives, 3-4 sets
4. Bloque 2 (main): 2 ejercicios (1 inferior + 1 superior) de hip-dominant/knee-dominant/pushes/pulls, sets según objetivo
5. Bloque 3 (main): 2 ejercicios unilaterales de hip-dominant/knee-dominant/pushes/pulls, sets según objetivo
6. Bloque 4 (main): 2-3 ejercicios de accessories/ankle-dominant, 2-3 sets

RESPONDE SOLO CON JSON (SOLO el objeto workouts, SIN program ni otros campos):
{
  "workouts": [
    {
      "name": "Día ${workoutOrderStart}",
      "description": "Descripción breve del enfoque del workout (ej: 'Potencia explosiva y fuerza de tracción')",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart},
      "day_of_week": 1,
      "estimated_duration_minutes": 60,
      "difficulty_level": "${userData.fitness_level}",
      "workout_type": "strength",
      "blocks": [
        {"name": "Activación 1", "block_type": "warmup", "sets": 2, "rest_between_exercises": 30, "exercises": [{"exercise_id": 123, "reps": 10, "exercise_order": 1, "weight_level": "no_weight"}]},
        {"name": "Activación 2", "block_type": "warmup", "sets": 2, "rest_between_exercises": 30, "exercises": [...]},
        {"name": "Bloque 1", "block_type": "main", "sets": 3, "rest_between_exercises": 120, "exercises": [...]},
        {"name": "Bloque 2", "block_type": "main", "sets": 4, "rest_between_exercises": 90, "exercises": [...]},
        {"name": "Bloque 3", "block_type": "main", "sets": 3, "rest_between_exercises": 90, "exercises": [...]},
        {"name": "Bloque 4", "block_type": "main", "sets": 3, "rest_between_exercises": 60, "exercises": [...]}
      ]
    },
    {
      "name": "Día ${workoutOrderStart + 1}",
      "description": "Descripción breve del enfoque del workout",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart + 1},
      "day_of_week": 3,
      "estimated_duration_minutes": 60,
      "difficulty_level": "${userData.fitness_level}",
      "workout_type": "strength",
      "blocks": [...]
    },
    {
      "name": "Día ${workoutOrderEnd}",
      "description": "Descripción breve del enfoque del workout",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderEnd},
      "day_of_week": 5,
      "estimated_duration_minutes": 60,
      "difficulty_level": "${userData.fitness_level}",
      "workout_type": "strength",
      "blocks": [...]
    }
  ]
}

REGLAS CRÍTICAS:
1. USA SOLO exercise_id de la lista (NO inventes IDs)
2. Cada workout DEBE tener EXACTAMENTE 6 bloques en el orden especificado
3. weight_level solo acepta: no_weight, light, medium, heavy
4. RESPONDE SOLO CON {"workouts": [...]} - NO incluyas "program" ni otros campos
5. COMPLETA TODOS los workouts y bloques - NO trunques la respuesta
6. Cada workout DEBE incluir "description" con el enfoque específico del día (10-20 palabras)`

  // Groq uses separate system and user messages
  logger.debug('Calling Groq API', { week: weekNumber, model: 'llama-3.3-70b-versatile' })
  
  let completion
  try {
    completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: weekPrompt,
        },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    })
  } catch (apiError: any) {
    logger.error('Groq API call failed', {
      week: weekNumber,
      error: apiError.message,
      status: apiError.status,
    })
    throw new Error(`Groq API error for week ${weekNumber}: ${apiError.message}`)
  }
  
  logger.debug('Groq API response received', { 
    week: weekNumber,
    finishReason: completion.choices[0]?.finish_reason,
    hasContent: !!completion.choices[0]?.message?.content
  })
  
  // Check if response was truncated
  const finishReason = completion.choices[0]?.finish_reason
  if (finishReason === 'length') {
    logger.warn('Response truncated due to token limit', { week: weekNumber })
    throw new Error(`Response truncated for week ${weekNumber}. Try increasing max_tokens or simplifying the prompt.`)
  }
  
  let responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    throw new Error(`Empty response from LLM for week ${weekNumber}`)
  }
  
  // Check if JSON appears incomplete (doesn't end with closing braces)
  const trimmedText = responseText.trim()
  if (!trimmedText.endsWith('}') && !trimmedText.endsWith(']')) {
    logger.warn('Response appears incomplete', { 
      week: weekNumber, 
      responseLength: responseText.length,
      lastChars: trimmedText.slice(-50)
    })
    throw new Error(`Incomplete JSON response for week ${weekNumber}. Response may have been truncated.`)
  }

  // Extract JSON from markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                    responseText.match(/(\{[\s\S]*\})/)
  
  if (jsonMatch) {
    responseText = jsonMatch[1]
  }

  let parsed
  try {
    parsed = JSON.parse(responseText)
    
    // If response includes extra fields (like "program"), extract just workouts
    if (parsed.program && parsed.workouts) {
      logger.warn('Response included extra "program" field, extracting workouts only', { week: weekNumber })
      parsed = { workouts: parsed.workouts }
    }
  } catch (error: any) {
    // Log the problematic JSON for debugging
    const errorPosition = error.message.match(/position (\d+)/)?.[1]
    const startPos = errorPosition ? Math.max(0, parseInt(errorPosition) - 200) : 0
    const endPos = errorPosition ? Math.min(responseText.length, parseInt(errorPosition) + 200) : Math.min(responseText.length, 400)
    const preview = responseText.substring(startPos, endPos)
    
    logger.error('JSON parse error from Groq', {
      week: weekNumber,
      error: error.message,
      responseLength: responseText.length,
      preview: preview,
      fullResponse: responseText.substring(0, 1000), // First 1000 chars
    })
    
    throw new Error(
      `Invalid JSON response from LLM for week ${weekNumber}: ${error.message}\n` +
      `Response preview (around error position ${errorPosition}): ${preview}\n` +
      `Full response length: ${responseText.length} chars`
    )
  }
  
  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error(`Invalid response format for week ${weekNumber}: missing workouts array`)
  }

  if (parsed.workouts.length !== PROGRAM_CONFIG.WORKOUTS_PER_WEEK) {
    throw new Error(`Week ${weekNumber} has ${parsed.workouts.length} workouts instead of ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK}`)
  }

  return parsed.workouts
}

/**
 * Generates program metadata deterministically based on the primary goal.
 * Uses the new goal-based system for naming and descriptions.
 */
function generateProgramMetadata(
  userData: UserData,
  programRequirements: ProgramRequirements | undefined
): { name: string; description: string; difficulty_level: string; program_type: string } {
  // Get primary goal using the new mapping
  const primaryGoal = mapUserGoalsToProgramGoal(userData.goals)
  const goalMeta = GOAL_METADATA[primaryGoal]
  
  // Program names based on goal
  const programNames: Record<string, string> = {
    improve_muscle_power: 'Potencia Explosiva',
    increase_muscle_mass: 'Desarrollo Muscular',
    improve_speed: 'Velocidad y Agilidad',
    maintenance: 'Mantenimiento Integral',
  }
  
  // Program descriptions based on goal
  const programDescriptions: Record<string, string> = {
    improve_muscle_power: 'Programa diseñado para desarrollar potencia explosiva y fuerza reactiva mediante ejercicios combinados de carga y velocidad.',
    increase_muscle_mass: 'Programa enfocado en hipertrofia muscular con alto volumen de entrenamiento y progresión de cargas.',
    improve_speed: 'Programa orientado a mejorar la velocidad y capacidad balística con ejercicios de alta demanda neural.',
    maintenance: 'Programa full body equilibrado para mantener tu condición física con un enfoque sostenible.',
  }
  
  return {
    name: programNames[primaryGoal] || 'Acondicionamiento General',
    description: programDescriptions[primaryGoal] || 'Programa personalizado para mejorar tu condición física.',
    difficulty_level: userData.fitness_level,
    program_type: primaryGoal,
  }
}

/**
 * Generates a personalized training program using the LLM.
 * 
 * Uses a week-by-week generation strategy to ensure all 12 workouts are created.
 * Each week is generated in a separate API call to avoid token limits.
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

  // Determine primary goal for this program
  const primaryGoal = mapUserGoalsToProgramGoal(userData.goals)
  const goalLabel = getPrimaryGoalLabel(userData.goals)
  
  logger.info('Building program prompt', { 
    primaryGoal, 
    goalLabel,
    userGoals: userData.goals 
  })

  // Fetch the active goal prompts from DB (or defaults)
  const goalPrompts = await getActiveGoalPrompts()
  
  // Build the complete system prompt (base + goal-specific)
  const systemPrompt = buildProgramPrompt(userData.goals, goalPrompts)
  
  // Generate program metadata (deterministic, no LLM call)
  const programMetadata = generateProgramMetadata(userData, programRequirements)
  
  // Generate each week separately to avoid token limits
  const allWorkouts: any[] = []
  let previousWeeksContext = ''
  
  for (let week = 1; week <= PROGRAM_CONFIG.DURATION_WEEKS; week++) {
    console.log(`Generating week ${week} of ${PROGRAM_CONFIG.DURATION_WEEKS}...`)
    
    const weekWorkouts = await generateWeekWorkouts(
      week,
      userData,
      programRequirements,
      exercises,
      systemPrompt,
      previousWeeksContext
    )
    
    allWorkouts.push(...weekWorkouts)
    
    // Build context for next week (summary of exercises used)
    const weekExerciseIds = weekWorkouts.flatMap((w: any) => 
      w.blocks?.flatMap((b: any) => 
        b.exercises?.map((e: any) => e.exercise_id) || []
      ) || []
    )
    previousWeeksContext += `Semana ${week}: IDs usados: ${[...new Set(weekExerciseIds)].slice(0, 10).join(', ')}\n`
  }

  // Validate we got all workouts
  if (allWorkouts.length !== PROGRAM_CONFIG.TOTAL_WORKOUTS) {
    throw new Error(`Generated ${allWorkouts.length} workouts instead of ${PROGRAM_CONFIG.TOTAL_WORKOUTS}`)
  }

  return {
    program: {
      name: programMetadata.name,
      description: programMetadata.description,
      duration_weeks: PROGRAM_CONFIG.DURATION_WEEKS,
      difficulty_level: programMetadata.difficulty_level,
      program_type: programMetadata.program_type,
    },
    workouts: allWorkouts,
  }
}
