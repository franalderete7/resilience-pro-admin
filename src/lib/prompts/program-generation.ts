/**
 * System prompts for LLM-based program generation.
 * 
 * This file contains all the prompts used to guide the AI in creating
 * personalized training programs following the Resilience Pro methodology.
 */

import { PROGRAM_CONFIG } from '../constants/exercise-categories'

/**
 * Core training methodology and block structure for Resilience Pro programs.
 * This is the foundation of the traditional Resilience Pro training approach.
 */
export const DEFAULT_METHODOLOGY = ``

export const DEFAULT_RULES = ``

/**
 * Exercise category descriptions for the LLM to understand each category.
 */
export const DEFAULT_CATEGORIES = ``

/**
 * Structure and output format rules.
 */
export const DEFAULT_STRUCTURE = `
FORMATO DE RESPUESTA JSON (OBLIGATORIO):
{
  "program": {
    "name": "Nombre del Programa",
    "description": "Breve descripción",
    "duration_weeks": 4
  },
  "workouts": [
    {
      "name": "W1D1: Nombre",
      "week_number": 1,
      "day_of_week": 1,
      "workout_order": 1,
      "blocks": [
        {
          "name": "Activación",
          "block_type": "warmup",
          "exercises": [
             { "exercise_id": 123, "reps": 10, "exercise_order": 1 }
          ]
        }
        // ... más bloques
      ]
    }
    // ... DEBE HABER EXACTAMENTE 12 OBJETOS WORKOUT EN TOTAL
  ]
}

REGLAS DE FORMATO:
1. NO incluyas nombres de ejercicios dentro del objeto "exercises", SOLO "exercise_id".
2. NO incluyas explicaciones fuera del JSON.
3. Asegúrate de cerrar todos los brackets y llaves.
4. Si el JSON es largo, NO LO CORTES. Prioriza la estructura completa sobre las descripciones detalladas.
`

export interface SystemPromptModules {
  methodology?: string;
  categories?: string;
  rules?: string;
  structure?: string;
}

/**
 * Builds the complete system prompt for program generation.
 * Accepts optional modules to override defaults.
 */
export function buildSystemPrompt(modules: SystemPromptModules = {}): string {
  // If modules are missing, we use the empty defaults, effectively forcing reliance on DB
  // or resulting in an empty prompt if DB is also empty (which shouldn't happen in prod)
  const methodology = modules.methodology || DEFAULT_METHODOLOGY;
  const categories = modules.categories || DEFAULT_CATEGORIES;
  const rules = modules.rules || DEFAULT_RULES;
  const structure = modules.structure || DEFAULT_STRUCTURE;

  return `Eres un entrenador personal certificado de Resilience Pro con más de 10 años de experiencia diseñando programas de entrenamiento personalizados. Tu enfoque se basa en la metodología propia de Resilience Pro, principios científicos de fisiología del ejercicio, periodización y adaptación neuromuscular.

${methodology}

${rules}

${categories}

${structure}`
}

/**
 * Builds the user prompt with specific user data and available exercises.
 */
export function buildUserPrompt(
  userData: {
    fitness_level: string
    goals: string[]
    gender?: string
    height?: number
    weight?: number
    weight_goal?: number
    preferences?: {
      available_equipment?: string[]
      workout_days_per_week?: number
      preferred_duration_minutes?: number
    }
  },
  programRequirements: { focus?: string } | undefined,
  exercises: Array<{
    exercise_id: number
    name: string
    category?: string
    muscle_groups?: string[]
    difficulty_level?: string
    equipment_needed?: string[]
  }>
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

  const preferredDuration = userData.preferences?.preferred_duration_minutes || 60

  // Filter exercises by available equipment if specified
  const availableEquipment = userData.preferences?.available_equipment || []
  const equipmentFilter =
    availableEquipment.length > 0
      ? `\nIMPORTANTE: Prioriza ejercicios que usen: ${availableEquipment.join(', ')}. Si no hay suficientes, incluye ejercicios sin equipo (no_weight).`
      : ''

  // Determine training method based on goals
  const trainingMethodHint = determineTrainingMethod(userData.goals)

  return `PERFIL DEL USUARIO:
Nivel de Fitness: ${userData.fitness_level}
Objetivos Principales: ${userData.goals.join(', ')}
Género: ${userData.gender || 'No especificado'}
Altura: ${userData.height ? `${userData.height} cm` : 'No especificado'}
Peso Actual: ${userData.weight ? `${userData.weight} kg` : 'No especificado'}
Peso Objetivo: ${userData.weight_goal ? `${userData.weight_goal} kg` : 'No especificado'}
Días de Entrenamiento: ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} días por semana (fijo)
Duración Preferida por Sesión: ${preferredDuration} minutos
Equipo Disponible: ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'No especificado (usar ejercicios sin equipo)'}

REQUISITOS ESPECÍFICOS:
Duración del Programa: ${PROGRAM_CONFIG.DURATION_WEEKS} SEMANAS (obligatorio)
Entrenamientos por Semana: ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} (obligatorio)
Enfoque: ${programRequirements?.focus || 'Basado en objetivos del usuario'}
${trainingMethodHint}
${equipmentFilter}

EJERCICIOS DISPONIBLES EN LA BASE DE DATOS:
(⚠️ ADVERTENCIA: Debes usar EXCLUSIVAMENTE los IDs listados abajo. NO inventes IDs. Si un ejercicio no está en esta lista, NO LO USES.)
${exercisesList}

INSTRUCCIONES ESPECÍFICAS:
1. Crea un programa de EXACTAMENTE ${PROGRAM_CONFIG.DURATION_WEEKS} semanas
2. ⚠️ CRÍTICO: Cada semana DEBE tener EXACTAMENTE ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} workouts:
   - Semana 1: 3 workouts (workout_order 1-3, week_number: 1)
   - Semana 2: 3 workouts (workout_order 4-6, week_number: 2)
   - Semana 3: 3 workouts (workout_order 7-9, week_number: 3)
   - Semana 4: 3 workouts (workout_order 10-12, week_number: 4)
   - TOTAL: ${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts - NO MENOS
   (El error más común es olvidar la Semana 4. ¡Asegúrate de incluirla completa!)
3. Cada workout debe durar aproximadamente ${preferredDuration} minutos
4. Sigue la estructura de bloques Resilience Pro (Activación 1, Activación 2, Bloques 1-4)
5. Selecciona ejercicios apropiados para nivel "${userData.fitness_level}"
6. Alinea los ejercicios con los objetivos: ${userData.goals.join(', ')}
7. Usa SOLO los exercise_id de la lista anterior (COPIA EXACTA del número, NO inventes)
8. NO incluyas nombres de ejercicios en el JSON de salida, solo IDs.
9. Progresa la dificultad a lo largo de las 4 semanas

⚠️ VERIFICACIÓN FINAL: Antes de responder, cuenta los workouts por semana. CADA semana debe tener EXACTAMENTE 3 workouts. Y verifica que cada ID usado exista en la lista "EJERCICIOS DISPONIBLES".

Crea un programa profesional siguiendo la metodología Resilience Pro.`
}

/**
 * Determines the recommended training method based on user goals.
 */
function determineTrainingMethod(goals: string[]): string {
  const goalsLower = goals.map((g) => g.toLowerCase())

  if (goalsLower.some((g) => g.includes('potencia') || g.includes('power') || g.includes('explosiv'))) {
    return `
MÉTODO RECOMENDADO: Complex Training (Fuerza/Potencia)
- Combina ejercicios pesados con pliométricos relacionados
- Enfócate en potenciación post-activación`
  }

  if (goalsLower.some((g) => g.includes('velocidad') || g.includes('speed') || g.includes('sprint'))) {
    return `
MÉTODO RECOMENDADO: French Contrast + Velocidad Pura
- Usa la secuencia de 4 ejercicios del French Contrast en bloques de potencia
- Incluye trabajo de velocidad pura con recuperación completa`
  }

  if (goalsLower.some((g) => g.includes('fuerza') || g.includes('strength') || g.includes('músculo'))) {
    return `
MÉTODO RECOMENDADO: Fuerza General
- Enfoque en patrones básicos de movimiento
- Progresión de cargas a lo largo de las semanas`
  }

  return `
MÉTODO: Híbrido según la estructura Resilience Pro
- Combina elementos de fuerza, potencia y velocidad según el bloque`
}
