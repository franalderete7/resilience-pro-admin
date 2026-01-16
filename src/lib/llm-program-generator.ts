import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse, UserData, ProgramRequirements } from './types/program'
import { buildSystemPrompt } from './prompts/program-generation'
import { getActiveSystemPrompt } from './prompts/prompt-service'
import { PROGRAM_CONFIG } from './constants/exercise-categories'
import { env } from './config/env'
import { logger } from './logger'

const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY)

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
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart},
      "day_of_week": 1,
      "estimated_duration_minutes": 60,
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
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart + 1},
      "day_of_week": 3,
      "estimated_duration_minutes": 60,
      "blocks": [...]
    },
    {
      "name": "Día ${workoutOrderEnd}",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderEnd},
      "day_of_week": 5,
      "estimated_duration_minutes": 60,
      "blocks": [...]
    }
  ]
}

REGLAS CRÍTICAS:
1. USA SOLO exercise_id de la lista (NO inventes IDs)
2. Cada workout DEBE tener EXACTAMENTE 6 bloques en el orden especificado
3. weight_level solo acepta: no_weight, light, medium, heavy
4. RESPONDE SOLO CON {"workouts": [...]} - NO incluyas "program" ni otros campos
5. COMPLETA TODOS los workouts y bloques - NO trunques la respuesta`

  // Combine system and user prompts for Google AI (it doesn't have separate system messages)
  const fullPrompt = `${systemPrompt}\n\n${weekPrompt}`
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-pro-preview',
    generationConfig: {
      // Gemini 3 works best with default temperature (1.0)
      // Lower temperatures can cause looping or degraded performance
      temperature: 1.0,
      // Increased token limit to prevent truncation (Gemini 3 supports up to 64k output tokens)
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  })

  logger.debug('Calling Gemini API', { week: weekNumber, model: 'gemini-3-pro-preview' })
  
  let result
  try {
    result = await model.generateContent(fullPrompt)
  } catch (apiError: any) {
    logger.error('Gemini API call failed', {
      week: weekNumber,
      error: apiError.message,
      status: apiError.status,
      details: apiError.errorDetails,
    })
    throw new Error(`Gemini API error for week ${weekNumber}: ${apiError.message}`)
  }
  
  const response = await result.response
  logger.debug('Gemini API response received', { 
    week: weekNumber, 
    finishReason: response.candidates?.[0]?.finishReason,
    hasText: !!response.text()
  })
  
  // Check if response was truncated
  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    logger.warn('Response truncated due to token limit', { week: weekNumber })
    throw new Error(`Response truncated for week ${weekNumber}. Try increasing maxOutputTokens or simplifying the prompt.`)
  }
  
  let responseText = response.text()

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
    
    logger.error('JSON parse error from Gemini', {
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
 * Translates goal enums to human-readable Spanish names.
 */
function translateGoal(goal: string): string {
  const goalTranslations: Record<string, string> = {
    gain_muscle: 'Hipertrofia',
    maintain: 'Mantenimiento',
    improve_speed: 'Velocidad',
    improve_endurance: 'Resistencia',
    lose_weight: 'Pérdida de Peso',
    increase_flexibility: 'Flexibilidad',
  }
  return goalTranslations[goal] || goal
}

/**
 * Generates program metadata deterministically (no LLM call needed).
 * Follows naming conventions: human-readable Spanish, no enums or technical terms.
 */
function generateProgramMetadata(
  userData: UserData,
  programRequirements: ProgramRequirements | undefined
): { name: string; description: string; difficulty_level: string } {
  // Translate goals to Spanish
  const translatedGoals = userData.goals.map(translateGoal)
  const mainGoal = translatedGoals[0] || 'Acondicionamiento General'
  
  // Generate human-readable program name (no enums, no "Resilience Pro Nivel X")
  const programNames: Record<string, string> = {
    'Hipertrofia': 'Fuerza y Desarrollo Muscular',
    'Mantenimiento': 'Mantenimiento y Tonificación',
    'Velocidad': 'Potencia Explosiva',
    'Resistencia': 'Resistencia y Acondicionamiento',
    'Pérdida de Peso': 'Acondicionamiento Metabólico',
    'Flexibilidad': 'Movilidad y Control Corporal',
  }
  const programName = programNames[mainGoal] || 'Acondicionamiento General'
  
  // Generate natural description (no enums)
  const goalDescriptions: Record<string, string> = {
    'Hipertrofia': 'desarrollar masa muscular y fuerza a través de trabajo con cargas progresivas',
    'Mantenimiento': 'mantener tu condición física actual con trabajo equilibrado de fuerza y resistencia',
    'Velocidad': 'mejorar tu velocidad y potencia explosiva mediante ejercicios balísticos y pliométricos',
    'Resistencia': 'desarrollar tu capacidad cardiovascular y resistencia muscular con circuitos de alta intensidad',
    'Pérdida de Peso': 'optimizar tu composición corporal combinando trabajo de fuerza y circuitos metabólicos',
    'Flexibilidad': 'mejorar tu rango de movimiento y control corporal con énfasis en movilidad',
  }
  const goalDescription = goalDescriptions[mainGoal] || 'mejorar tu condición física general'
  
  return {
    name: programName,
    description: `Programa enfocado en ${goalDescription}. Incluye progresión semanal adaptada a tu nivel.`,
    difficulty_level: userData.fitness_level,
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

  // Fetch the active system prompt configuration from DB (or defaults)
  const promptModules = await getActiveSystemPrompt()
  const systemPrompt = buildSystemPrompt(promptModules)
  
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
    },
    workouts: allWorkouts,
  }
}
