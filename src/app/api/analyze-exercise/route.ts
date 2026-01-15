import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { EXERCISE_CATEGORIES } from '@/lib/constants/exercise-categories'
import { analyzeExerciseSchema } from '@/lib/validation/schemas'
import { rateLimitExpensive } from '@/lib/rate-limit'
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  rateLimitErrorResponse,
  handleRouteError 
} from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'
import { env } from '@/lib/config/env'

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (expensive operation - LLM call)
    const { success, remaining, reset } = await rateLimitExpensive(request)
    if (!success) {
      return rateLimitErrorResponse(reset)
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = analyzeExerciseSchema.safeParse(body)
    
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { filename } = validationResult.data
    
    logger.info('Analyzing exercise', { filename })

    // Build category list dynamically from constants
    const categoryList = EXERCISE_CATEGORIES.map(
      cat => `- ${cat.value} (${cat.label})`
    ).join('\n')

    const prompt = `Analiza el siguiente nombre de ejercicio y proporciona información detallada en español.
    
    Nombre del archivo: "${filename}"
    
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

    Categorías válidas (usa los valores exactos en inglés):
    ${categoryList}

    Niveles de dificultad:
    - beginner (principiante)
    - intermediate (intermedio)
    - advanced (avanzado)

    Instrucciones:
    1. El nombre debe estar limpio (sin guiones, abreviaciones claras)
    2. La descripción DEBE ser pasos de ejecución numerados (formato: "1. Paso\\n2. Paso\\n3. Paso")
    3. Selecciona las categorías más apropiadas de la lista (puede ser más de una)
    4. Infiere el nivel de dificultad basándote en la complejidad del ejercicio
    5. Lista los grupos musculares principales que trabaja
    6. Lista el equipo necesario (si no necesita equipo, devuelve un array vacío)

    Responde SOLO con el JSON, sin texto adicional.`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 1500,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.error('Failed to extract JSON from LLM response', { 
        responsePreview: responseText.substring(0, 100) 
      })
      return errorResponse('No se pudo extraer JSON de la respuesta del modelo', 500)
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    logger.info('Exercise analysis completed', { 
      filename,
      category: analysisResult.categories?.[0],
      difficulty: analysisResult.difficulty_level 
    })

    const response = successResponse(analysisResult)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    
    return response
  } catch (error) {
    return handleRouteError(error)
  }
}
