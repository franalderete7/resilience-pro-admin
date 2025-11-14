import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase-admin'
import type { LLMProgramResponse, UserData, ProgramRequirements } from './types/program'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

async function fetchAvailableExercises() {
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select('exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed')

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`)
  }

  return data || []
}

function buildSystemPrompt(): string {
  return `Eres un entrenador personal certificado con más de 10 años de experiencia diseñando programas de entrenamiento personalizados. Tu enfoque se basa en principios científicos de fisiología del ejercicio, periodización y adaptación neuromuscular.

PRINCIPIOS FUNDAMENTALES:
1. PROGRESIÓN: Diseña programas que progresen de forma segura y efectiva
2. ESPECIFICIDAD: Selecciona ejercicios que se alineen con los objetivos del usuario
3. RECUPERACIÓN: Incluye días de descanso adecuados entre sesiones
4. VARIEDAD: Combina diferentes tipos de ejercicios para evitar estancamiento
5. SEGURIDAD: Prioriza la técnica correcta y ejercicios apropiados para el nivel del usuario

ESTRUCTURA DEL PROGRAMA:
- Duración: SIEMPRE 2 semanas (14 días)
- Frecuencia: 2-3 workouts por semana (distribuidos estratégicamente)
- Cada workout debe tener:
  * Warmup block (calentamiento): 5-10 minutos, ejercicios de movilidad y activación
  * Main blocks (principal): 1-3 bloques según el objetivo, ejercicios principales
  * Cooldown block (enfriamiento): 5 minutos, estiramientos y relajación

DISEÑO DE WORKOUTS:
- Distribuye workouts a lo largo de la semana (ej: Lunes/Miércoles/Viernes o Martes/Jueves/Sábado)
- Varía la intensidad y volumen entre sesiones
- Para principiantes: Enfócate en técnica, 2-3 ejercicios por bloque principal
- Para intermedios: Aumenta volumen, 3-4 ejercicios por bloque principal
- Para avanzados: Mayor intensidad y complejidad, 4-5 ejercicios por bloque principal

DISEÑO DE BLOCKS:
- Warmup: 1-2 ejercicios de movilidad/activación, 1 set, 10-15 reps, no_weight o light
- Main: 2-5 ejercicios según nivel, 2-4 sets, reps según objetivo:
  * Fuerza: 4-6 reps, medium/heavy weight
  * Hipertrofia: 8-12 reps, medium weight
  * Resistencia: 12-20 reps, light/medium weight
- Cooldown: 2-3 ejercicios de estiramiento, 1 set, 30-60 segundos hold, no_weight

SELECCIÓN DE EJERCICIOS:
- Usa SOLO los exercise_id de la lista proporcionada
- Combina ejercicios compuestos y de aislamiento
- Varía los grupos musculares trabajados en cada sesión
- Considera el equipo disponible del usuario
- Asegura equilibrio muscular (push/pull, superior/inferior)

REPS Y VOLUMEN:
- Principiante: 2-3 sets, 10-15 reps, descanso 60-90 segundos
- Intermedio: 3-4 sets, 8-12 reps, descanso 90-120 segundos
- Avanzado: 3-5 sets, 6-10 reps, descanso 120-180 segundos

FORMATO DE RESPUESTA JSON:
{
  "program": {
    "name": "Nombre descriptivo del programa",
    "description": "Descripción detallada de 2-3 oraciones explicando el enfoque, objetivos y metodología",
    "duration_weeks": 2,
    "difficulty_level": "beginner|intermediate|advanced",
    "program_type": "strength|cardio|hybrid|etc"
  },
  "workouts": [
    {
      "name": "Nombre del workout (ej: 'Entrenamiento Superior - Semana 1')",
      "description": "Descripción breve del enfoque del workout",
      "estimated_duration_minutes": 45-60,
      "difficulty_level": "beginner|intermediate|advanced",
      "workout_type": "strength|cardio|hybrid",
      "week_number": 1 o 2,
      "day_of_week": 1-7 (1=Lunes, 7=Domingo),
      "workout_order": 1, 2, 3, etc.,
      "blocks": [
        {
          "name": "Calentamiento",
          "block_type": "warmup",
          "sets": 1,
          "rest_between_exercises": 30,
          "exercises": [...]
        },
        {
          "name": "Entrenamiento Principal",
          "block_type": "main",
          "sets": 3,
          "rest_between_exercises": 90,
          "exercises": [...]
        },
        {
          "name": "Enfriamiento",
          "block_type": "cooldown",
          "sets": 1,
          "rest_between_exercises": 0,
          "exercises": [...]
        }
      ]
    }
  ]
}

IMPORTANTE:
- Crea exactamente 2-3 workouts por semana (4-6 workouts totales para 2 semanas)
- Distribuye workouts estratégicamente (no días consecutivos para principiantes)
- Cada workout debe tener mínimo 3 blocks (warmup, main, cooldown)
- Usa SOLO exercise_id que existan en la lista proporcionada
- Respeta los enums y valores válidos especificados
- Responde SOLO con JSON válido, sin texto adicional ni markdown`
}

function buildUserPrompt(
  userData: UserData,
  programRequirements: ProgramRequirements | undefined,
  exercises: any[]
): string {
  const exercisesList = exercises
    .map(
      (e) =>
        `ID: ${e.exercise_id} | ${e.name} | Categoría: ${e.category || 'N/A'} | Músculos: ${
        e.muscle_groups?.join(', ') || 'N/A'
      } | Dificultad: ${e.difficulty_level || 'N/A'} | Equipo: ${
        e.equipment_needed?.join(', ') || 'N/A'
      }`
    )
    .join('\n')

  const workoutDaysPerWeek = userData.preferences?.workout_days_per_week || 3
  const preferredDuration = userData.preferences?.preferred_duration_minutes || 45

  // Filter exercises by available equipment if specified
  const availableEquipment = userData.preferences?.available_equipment || []
  const equipmentFilter = availableEquipment.length > 0
    ? `\nIMPORTANTE: Prioriza ejercicios que usen: ${availableEquipment.join(', ')}. Si no hay suficientes, incluye ejercicios sin equipo (no_weight).`
    : ''

  return `PERFIL DEL USUARIO:
Nivel de Fitness: ${userData.fitness_level}
Objetivos Principales: ${userData.goals.join(', ')}
Género: ${userData.gender || 'No especificado'}
Altura: ${userData.height ? `${userData.height} cm` : 'No especificado'}
Peso Actual: ${userData.weight ? `${userData.weight} kg` : 'No especificado'}
Peso Objetivo: ${userData.weight_goal ? `${userData.weight_goal} kg` : 'No especificado'}
Días de Entrenamiento Preferidos: ${workoutDaysPerWeek} días por semana
Duración Preferida por Sesión: ${preferredDuration} minutos
Equipo Disponible: ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'No especificado (usar ejercicios sin equipo)'}

REQUISITOS ESPECÍFICOS:
Duración del Programa: 2 SEMANAS (obligatorio)
Enfoque: ${programRequirements?.focus || 'Basado en objetivos del usuario'}
${equipmentFilter}

EJERCICIOS DISPONIBLES EN LA BASE DE DATOS:
${exercisesList}

INSTRUCCIONES ESPECÍFICAS:
1. Crea un programa de EXACTAMENTE 2 semanas
2. Distribuye ${workoutDaysPerWeek} workouts por semana (${workoutDaysPerWeek * 2} workouts totales)
3. Cada workout debe durar aproximadamente ${preferredDuration} minutos
4. Incluye siempre: warmup block, main blocks, cooldown block
5. Selecciona ejercicios apropiados para nivel "${userData.fitness_level}"
6. Alinea los ejercicios con los objetivos: ${userData.goals.join(', ')}
7. Usa SOLO los exercise_id de la lista anterior
8. Distribuye workouts estratégicamente (evita días consecutivos para principiantes)
9. Varía la intensidad y ejercicios entre semanas para progresión

Crea un programa profesional, estructurado y efectivo usando SOLO los exercise_id proporcionados.`
}

export async function generateProgramWithLLM(
  userData: UserData,
  programRequirements?: ProgramRequirements
): Promise<LLMProgramResponse> {
  const exercises = await fetchAvailableExercises()

  if (exercises.length === 0) {
    throw new Error('No exercises available in database')
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(userData, programRequirements, exercises)

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.8,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    throw new Error('Empty response from LLM')
  }

  try {
    const parsed = JSON.parse(responseText)
    const program = parsed as LLMProgramResponse
    
    // Enforce 2 weeks duration
    program.program.duration_weeks = 2
    
    return program
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`)
  }
}

