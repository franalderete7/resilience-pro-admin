import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse, UserData, ProgramRequirements } from './types/program'
import { buildSystemPrompt } from './prompts/program-generation'
import { getActiveSystemPrompt } from './prompts/prompt-service'
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
- ${weekNumber === 1 ? 'Establece la base del programa' : ''}
- ${weekNumber === 2 ? 'Incrementa ligeramente la intensidad' : ''}
- ${weekNumber === 3 ? 'Pico de volumen/intensidad' : ''}
- ${weekNumber === 4 ? 'Semana de descarga o consolidación' : ''}

EJERCICIOS DISPONIBLES (formato: ID:nombre|categoría|músculos|dificultad):
${exercisesList}

RESPONDE SOLO CON JSON EN ESTE FORMATO EXACTO:
{
  "workouts": [
    {
      "name": "W${weekNumber}D1: Nombre",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart},
      "day_of_week": 1,
      "estimated_duration_minutes": 60,
      "blocks": [
        {
          "name": "Activación 1",
          "block_type": "warmup",
          "sets": 2,
          "exercises": [
            {"exercise_id": 123, "reps": 10, "exercise_order": 1}
          ]
        }
      ]
    },
    {
      "name": "W${weekNumber}D2: Nombre",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderStart + 1},
      "day_of_week": 3,
      "estimated_duration_minutes": 60,
      "blocks": [...]
    },
    {
      "name": "W${weekNumber}D3: Nombre",
      "week_number": ${weekNumber},
      "workout_order": ${workoutOrderEnd},
      "day_of_week": 5,
      "estimated_duration_minutes": 60,
      "blocks": [...]
    }
  ]
}

REGLAS:
1. USA SOLO exercise_id de la lista (NO inventes IDs)
2. Cada workout debe tener 4-6 bloques (Activación 1, Activación 2, Bloque 1-4)
3. Cada bloque debe tener 2-4 ejercicios
4. NO incluyas descripciones largas, solo nombres cortos
5. RESPONDE SOLO CON EL JSON, nada más`

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: weekPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    throw new Error(`Empty response from LLM for week ${weekNumber}`)
  }

  const parsed = JSON.parse(responseText)
  
  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error(`Invalid response format for week ${weekNumber}: missing workouts array`)
  }

  if (parsed.workouts.length !== PROGRAM_CONFIG.WORKOUTS_PER_WEEK) {
    throw new Error(`Week ${weekNumber} has ${parsed.workouts.length} workouts instead of ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK}`)
  }

  return parsed.workouts
}

/**
 * Generates program metadata.
 */
async function generateProgramMetadata(
  userData: UserData,
  programRequirements: ProgramRequirements | undefined,
  systemPrompt: string
): Promise<{ name: string; description: string; difficulty_level: string }> {
  const metadataPrompt = `Genera metadatos para un programa de entrenamiento.

PERFIL DEL USUARIO:
- Nivel: ${userData.fitness_level}
- Objetivos: ${userData.goals.join(', ')}
- Enfoque: ${programRequirements?.focus || 'General'}

RESPONDE SOLO CON JSON:
{
  "name": "Nombre del Programa (máx 50 caracteres)",
  "description": "Descripción breve del programa (máx 200 caracteres)",
  "difficulty_level": "${userData.fitness_level}"
}`

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: metadataPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    // Fallback metadata
    return {
      name: `Programa ${userData.fitness_level} - ${userData.goals[0] || 'General'}`,
      description: `Programa de ${PROGRAM_CONFIG.DURATION_WEEKS} semanas para ${userData.goals.join(', ')}`,
      difficulty_level: userData.fitness_level,
    }
  }

  return JSON.parse(responseText)
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
  
  // Generate program metadata first
  const programMetadata = await generateProgramMetadata(userData, programRequirements, systemPrompt)
  
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
