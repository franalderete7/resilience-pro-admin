import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase-admin'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface LLMProgramResponse {
  program: {
    name: string
    description?: string
    duration_weeks: number
    difficulty_level?: string
    program_type?: string
  }
  workouts: Array<{
    name: string
    description?: string
    estimated_duration_minutes?: number
    difficulty_level?: string
    workout_type?: string
    week_number?: number
    day_of_week?: number
    workout_order: number
    blocks: Array<{
      name: string
      block_type?: string
      sets?: number
      rest_between_exercises?: number
      exercises: Array<{
        exercise_id: number
        reps: number
        weight_level?: string
        exercise_order: number
      }>
    }>
  }>
}

export interface UserData {
  fitness_level: 'beginner' | 'intermediate' | 'advanced'
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
}

export interface ProgramRequirements {
  duration_weeks?: number
  focus?: string
}

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
  return `Eres un experto entrenador personal y programador de ejercicios. Tu tarea es crear programas de entrenamiento personalizados basados en los datos del usuario y los ejercicios disponibles.

INSTRUCCIONES:
1. Analiza los datos del usuario (nivel de fitness, objetivos, preferencias)
2. Selecciona ejercicios SOLO de la lista proporcionada (usa exercise_id exactos)
3. Crea un programa estructurado con workouts, blocks y ejercicios
4. Asegúrate de progresión adecuada según el nivel del usuario
5. Respeta los días de descanso y recuperación
6. Usa solo los exercise_id que existen en la lista proporcionada

ESTRUCTURA REQUERIDA:
- Program: nombre, descripción, duración en semanas, nivel de dificultad, tipo
- Workouts: nombre, descripción, duración estimada, nivel, tipo, semana, día, orden
- Blocks: nombre, tipo (warmup/main/cooldown/superset/circuit/standard), sets, descanso entre ejercicios
- Exercises: exercise_id (debe existir), reps, weight_level (no_weight/light/medium/heavy), orden

RESPONDE SOLO CON JSON válido, sin texto adicional.`
}

function buildUserPrompt(
  userData: UserData,
  programRequirements: ProgramRequirements | undefined,
  exercises: any[]
): string {
  const exercisesList = exercises
    .map(
      (e) =>
        `ID: ${e.exercise_id} - ${e.name} | Categoría: ${e.category || 'N/A'} | Músculos: ${
        e.muscle_groups?.join(', ') || 'N/A'
      } | Dificultad: ${e.difficulty_level || 'N/A'} | Equipo: ${
        e.equipment_needed?.join(', ') || 'N/A'
      }`
    )
    .join('\n')

  return `DATOS DEL USUARIO:
- Nivel de fitness: ${userData.fitness_level}
- Objetivos: ${userData.goals.join(', ')}
- Género: ${userData.gender || 'No especificado'}
- Altura: ${userData.height || 'No especificado'} cm
- Peso: ${userData.weight || 'No especificado'} kg
- Peso objetivo: ${userData.weight_goal || 'No especificado'} kg
- Días de entrenamiento por semana: ${userData.preferences?.workout_days_per_week || 'No especificado'}
- Duración preferida: ${userData.preferences?.preferred_duration_minutes || 'No especificado'} minutos
- Equipo disponible: ${userData.preferences?.available_equipment?.join(', ') || 'No especificado'}

REQUISITOS DEL PROGRAMA:
- Duración: ${programRequirements?.duration_weeks || 'A determinar según objetivos'} semanas
- Enfoque: ${programRequirements?.focus || 'General'}

EJERCICIOS DISPONIBLES (usa SOLO estos exercise_id):
${exercisesList}

Crea un programa completo y estructurado usando SOLO los exercise_id de la lista anterior.`
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
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    throw new Error('Empty response from LLM')
  }

  try {
    const parsed = JSON.parse(responseText)
    return parsed as LLMProgramResponse
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`)
  }
}

