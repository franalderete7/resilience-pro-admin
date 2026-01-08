/**
 * Migration Script: Update Exercise Descriptions and Categories
 * 
 * This script updates all existing exercises with:
 * - New execution steps format for descriptions
 * - New category enum values
 * 
 * Run with: npx tsx scripts/migrate-exercises.ts
 * 
 * Options:
 *   --dry-run    Preview changes without updating database
 *   --limit=N    Only process N exercises (for testing)
 */

import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const groqApiKey = process.env.GROQ_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!groqApiKey) {
  console.error('❌ Missing GROQ_API_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const groq = new Groq({ apiKey: groqApiKey })

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

interface Exercise {
  exercise_id: number
  name: string
  description: string | null
  category: string | null
}

interface AnalysisResult {
  name: string
  description: string
  categories: string[]
  difficulty_level: string
  muscle_groups: string[]
  equipment_needed: string[]
}

/**
 * Analyzes an exercise name and generates updated description and category
 */
async function analyzeExercise(exerciseName: string): Promise<AnalysisResult | null> {
  const prompt = `Analiza el siguiente nombre de ejercicio y proporciona información detallada en español.
    
Nombre del ejercicio: "${exerciseName}"
    
Basándote en el nombre del ejercicio, genera la siguiente información en formato JSON:

{
  "name": "Nombre del ejercicio en español (limpio y formateado)",
  "description": "1. Primer paso de ejecución\\n2. Segundo paso de ejecución\\n3. Tercer paso de ejecución\\n4. Etc.",
  "categories": ["categoría1", "categoría2"],
  "difficulty_level": "beginner|intermediate|advanced",
  "muscle_groups": ["grupo muscular 1", "grupo muscular 2"],
  "equipment_needed": ["equipo 1", "equipo 2"]
}

IMPORTANTE - Formato de description:
- La descripción debe ser PASOS DE EJECUCIÓN numerados
- Cada paso debe empezar con el número seguido de un punto y espacio (ej: "1. ")
- Separa cada paso con un salto de línea (\\n)
- Incluye entre 3 y 6 pasos claros y concisos
- Los pasos deben explicar CÓMO ejecutar el ejercicio correctamente
- Ejemplo de formato:
  "1. Posición inicial: colócate de pie con los pies al ancho de los hombros\\n2. Flexiona las rodillas y baja las caderas como si fueras a sentarte\\n3. Mantén la espalda recta y el pecho elevado\\n4. Baja hasta que los muslos estén paralelos al suelo\\n5. Empuja con los talones para volver a la posición inicial"

Categorías válidas (usa los valores exactos en inglés, selecciona la MÁS apropiada como primera):
- accessories (ejercicios accesorios para músculos pequeños)
- agility (agilidad, cambios de dirección)
- ballistics and plyometrics (ejercicios explosivos, saltos)
- core (estabilidad del tronco)
- hip-dominant (dominante de cadera: peso muerto, hip thrust)
- knee-dominant (dominante de rodilla: sentadillas, zancadas)
- pushes (empujes: press, flexiones)
- isometrics (ejercicios isométricos, holds)
- mobility and flexibility (movilidad y flexibilidad)
- running technique (técnicas de carrera)
- pulls (tracciones: remos, dominadas)

Niveles de dificultad:
- beginner (principiante)
- intermediate (intermedio)
- advanced (avanzado)

Instrucciones:
1. El nombre debe estar limpio (sin guiones, abreviaciones claras)
2. La descripción DEBE ser pasos de ejecución numerados (formato: "1. Paso\\n2. Paso\\n3. Paso")
3. Selecciona las categorías más apropiadas de la lista (la primera es la principal)
4. Infiere el nivel de dificultad basándote en la complejidad del ejercicio
5. Lista los grupos musculares principales que trabaja
6. Lista el equipo necesario (si no necesita equipo, devuelve un array vacío)

Responde SOLO con el JSON, sin texto adicional.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 1500,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      console.error(`   ⚠️ Could not extract JSON from response`)
      return null
    }

    return JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch (error) {
    console.error(`   ⚠️ Error analyzing exercise:`, error)
    return null
  }
}

/**
 * Updates an exercise in the database
 */
async function updateExercise(
  exerciseId: number, 
  description: string, 
  category: string
): Promise<boolean> {
  const { error } = await supabase
    .from('exercises')
    .update({ 
      description,
      category 
    })
    .eq('exercise_id', exerciseId)

  if (error) {
    console.error(`   ❌ Database update failed:`, error.message)
    return false
  }
  return true
}

/**
 * Delay helper to avoid rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Main migration function
 */
async function migrateExercises() {
  console.log('\n🏋️ Exercise Migration Script')
  console.log('================================')
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '✏️ LIVE (will update database)'}`)
  if (limit) console.log(`Limit: Processing only ${limit} exercises`)
  console.log('')

  // Fetch all exercises
  let query = supabase
    .from('exercises')
    .select('exercise_id, name, description, category')
    .order('exercise_id', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data: exercises, error } = await query

  if (error) {
    console.error('❌ Failed to fetch exercises:', error.message)
    process.exit(1)
  }

  if (!exercises || exercises.length === 0) {
    console.log('ℹ️ No exercises found in database')
    process.exit(0)
  }

  console.log(`📋 Found ${exercises.length} exercises to process\n`)

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i] as Exercise
    const progress = `[${i + 1}/${exercises.length}]`
    
    console.log(`${progress} Processing: ${exercise.name}`)
    console.log(`   Current category: ${exercise.category || 'none'}`)
    console.log(`   Current description: ${exercise.description?.substring(0, 50) || 'none'}...`)

    // Analyze exercise with AI
    const analysis = await analyzeExercise(exercise.name)

    if (!analysis) {
      console.log(`   ⏭️ Skipped (analysis failed)\n`)
      skippedCount++
      continue
    }

    const newCategory = analysis.categories[0] || exercise.category
    const newDescription = analysis.description

    console.log(`   New category: ${newCategory}`)
    console.log(`   New description: ${newDescription.substring(0, 50)}...`)

    if (isDryRun) {
      console.log(`   ✅ Would update (dry run)\n`)
      successCount++
    } else {
      const success = await updateExercise(exercise.exercise_id, newDescription, newCategory!)
      if (success) {
        console.log(`   ✅ Updated successfully\n`)
        successCount++
      } else {
        console.log(`   ❌ Update failed\n`)
        errorCount++
      }
    }

    // Rate limiting: wait 1 second between API calls
    if (i < exercises.length - 1) {
      await delay(1000)
    }
  }

  // Summary
  console.log('\n================================')
  console.log('📊 Migration Summary')
  console.log('================================')
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`⏭️ Skipped: ${skippedCount}`)
  console.log(`📋 Total: ${exercises.length}`)
  
  if (isDryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.')
  }
}

// Run the migration
migrateExercises()
  .then(() => {
    console.log('\n✨ Migration complete!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })

