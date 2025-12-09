/**
 * Test Script: Program Generation
 * 
 * This script tests the program generation to verify it creates 4-week programs.
 * 
 * Run with: npx tsx scripts/test-program-generation.ts
 */

import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const groqApiKey = process.env.GROQ_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !groqApiKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const groq = new Groq({ apiKey: groqApiKey })

// Import the config
const PROGRAM_CONFIG = {
  DURATION_WEEKS: 4,
  WORKOUTS_PER_WEEK: 3,
  TOTAL_WORKOUTS: 12,
} as const

async function fetchExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed')

  if (error) throw new Error(`Failed to fetch exercises: ${error.message}`)
  return data || []
}

function buildSystemPrompt(): string {
  return `Eres un entrenador personal certificado de Resilience Pro con más de 10 años de experiencia diseñando programas de entrenamiento personalizados. Tu enfoque se basa en la metodología propia de Resilience Pro, principios científicos de fisiología del ejercicio, periodización y adaptación neuromuscular.

METODOLOGÍA DE ENTRENAMIENTO RESILIENCE PRO:

El método de planificación sigue la siguiente línea de trabajo. Esta es la base del entrenamiento tradicional de Resilience Pro:

1. ACTIVACIÓN 1 (Warmup): Ejercicios de movilidad y flexibilidad
2. ACTIVACIÓN 2 (Warmup): Ejercicios de core, estabilidad y patrones básicos de movimiento livianos
3. BLOQUE 1 (Main): Ejercicios de gran demanda de velocidad
4. BLOQUE 2 (Main): Patrones básicos de movimiento, pesados (inferior + superior)
5. BLOQUE 3 (Main): Patrones básicos de movimiento unilaterales, pesados
6. BLOQUE 4 (Main/Cooldown): Ejercicios accesorios

ESTRUCTURA DEL PROGRAMA:
- Duración: SIEMPRE ${PROGRAM_CONFIG.DURATION_WEEKS} semanas (${PROGRAM_CONFIG.DURATION_WEEKS * 7} días)
- Frecuencia: ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} entrenamientos por semana (${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts totales)
- Cada workout debe seguir la estructura de bloques de Resilience Pro

FORMATO DE RESPUESTA JSON:
{
  "program": {
    "name": "Nombre descriptivo del programa",
    "description": "Descripción detallada",
    "duration_weeks": ${PROGRAM_CONFIG.DURATION_WEEKS},
    "difficulty_level": "beginner|intermediate|advanced",
    "program_type": "strength|power|speed|hybrid"
  },
  "workouts": [
    {
      "name": "Nombre del workout",
      "description": "Descripción breve",
      "estimated_duration_minutes": 45-75,
      "difficulty_level": "beginner|intermediate|advanced",
      "workout_type": "strength|power|speed|hybrid",
      "week_number": 1-4,
      "day_of_week": 1-7,
      "workout_order": 1-12,
      "blocks": [...]
    }
  ]
}

IMPORTANTE:
- Crea exactamente ${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts (${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} por semana × ${PROGRAM_CONFIG.DURATION_WEEKS} semanas)
- duration_weeks DEBE ser ${PROGRAM_CONFIG.DURATION_WEEKS}
- Responde SOLO con JSON válido, sin texto adicional ni markdown`
}

function buildUserPrompt(exercises: any[]): string {
  const exercisesList = exercises
    .map((e) => `ID: ${e.exercise_id} | ${e.name} | Categoría: ${e.category || 'N/A'}`)
    .join('\n')

  return `PERFIL DEL USUARIO:
Nivel de Fitness: intermediate
Objetivos Principales: fuerza, hipertrofia
Días de Entrenamiento: ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} días por semana (fijo)
Duración Preferida por Sesión: 60 minutos

REQUISITOS ESPECÍFICOS:
Duración del Programa: ${PROGRAM_CONFIG.DURATION_WEEKS} SEMANAS (obligatorio)
Entrenamientos por Semana: ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} (obligatorio)

EJERCICIOS DISPONIBLES EN LA BASE DE DATOS:
${exercisesList}

INSTRUCCIONES ESPECÍFICAS:
1. Crea un programa de EXACTAMENTE ${PROGRAM_CONFIG.DURATION_WEEKS} semanas
2. Distribuye ${PROGRAM_CONFIG.WORKOUTS_PER_WEEK} workouts por semana (${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts totales)
3. Usa SOLO los exercise_id de la lista anterior

Crea un programa profesional siguiendo la metodología Resilience Pro.`
}

async function testProgramGeneration() {
  console.log('\n🧪 Testing Program Generation')
  console.log('================================')
  console.log(`Expected: ${PROGRAM_CONFIG.DURATION_WEEKS} weeks, ${PROGRAM_CONFIG.TOTAL_WORKOUTS} workouts`)
  console.log('')

  // Fetch exercises
  console.log('📋 Fetching exercises...')
  const exercises = await fetchExercises()
  console.log(`   Found ${exercises.length} exercises`)

  if (exercises.length === 0) {
    console.error('❌ No exercises found in database')
    process.exit(1)
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(exercises)

  console.log('\n📝 System Prompt Preview:')
  console.log('   ' + systemPrompt.substring(0, 200) + '...')
  console.log('\n📝 User Prompt Preview:')
  console.log('   ' + userPrompt.substring(0, 200) + '...')

  // Call LLM
  console.log('\n🤖 Calling LLM...')
  const startTime = Date.now()

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.8,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`   Completed in ${duration}s`)

  const responseText = completion.choices[0]?.message?.content

  if (!responseText) {
    console.error('❌ Empty response from LLM')
    process.exit(1)
  }

  // Parse response
  console.log('\n📊 Parsing response...')
  const parsed = JSON.parse(responseText)

  // Analyze results
  console.log('\n================================')
  console.log('📊 Results Analysis')
  console.log('================================')
  console.log(`Program Name: ${parsed.program?.name}`)
  console.log(`Duration Weeks: ${parsed.program?.duration_weeks} (expected: ${PROGRAM_CONFIG.DURATION_WEEKS})`)
  console.log(`Total Workouts: ${parsed.workouts?.length} (expected: ${PROGRAM_CONFIG.TOTAL_WORKOUTS})`)
  console.log(`Difficulty: ${parsed.program?.difficulty_level}`)
  console.log(`Type: ${parsed.program?.program_type}`)

  // Check week distribution
  const weekCounts: Record<number, number> = {}
  parsed.workouts?.forEach((w: any) => {
    const week = w.week_number || 0
    weekCounts[week] = (weekCounts[week] || 0) + 1
  })

  console.log('\n📅 Workouts per Week:')
  Object.entries(weekCounts).sort(([a], [b]) => Number(a) - Number(b)).forEach(([week, count]) => {
    console.log(`   Week ${week}: ${count} workouts`)
  })

  // Validation
  console.log('\n✅ Validation:')
  const durationCorrect = parsed.program?.duration_weeks === PROGRAM_CONFIG.DURATION_WEEKS
  const workoutCountCorrect = parsed.workouts?.length >= PROGRAM_CONFIG.TOTAL_WORKOUTS * 0.8

  console.log(`   Duration (${PROGRAM_CONFIG.DURATION_WEEKS} weeks): ${durationCorrect ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Workout Count (≥${Math.floor(PROGRAM_CONFIG.TOTAL_WORKOUTS * 0.8)}): ${workoutCountCorrect ? '✅ PASS' : '❌ FAIL'}`)

  if (!durationCorrect || !workoutCountCorrect) {
    console.log('\n⚠️ LLM did not follow instructions correctly!')
    console.log('   The prompt clearly states 4 weeks and 12 workouts.')
  }

  // Show first workout structure
  if (parsed.workouts?.length > 0) {
    const firstWorkout = parsed.workouts[0]
    console.log('\n📋 First Workout Structure:')
    console.log(`   Name: ${firstWorkout.name}`)
    console.log(`   Week: ${firstWorkout.week_number}`)
    console.log(`   Day: ${firstWorkout.day_of_week}`)
    console.log(`   Blocks: ${firstWorkout.blocks?.length}`)
    firstWorkout.blocks?.forEach((b: any, i: number) => {
      console.log(`      ${i + 1}. ${b.name} (${b.block_type}) - ${b.exercises?.length} exercises`)
    })
  }
}

testProgramGeneration()
  .then(() => {
    console.log('\n✨ Test complete!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })

