import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { EXERCISE_CATEGORIES } from '@/lib/constants/exercise-categories'

// Simple server-side logger
const logError = (msg: string, err: any) => {
  console.error(JSON.stringify({
    level: 'error',
    message: msg,
    error: err instanceof Error ? err.message : err,
    stack: err instanceof Error ? err.stack : undefined,
    timestamp: new Date().toISOString()
  }))
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const fileName = body.filename || ''

    if (!fileName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del archivo' },
        { status: 400 }
      )
    }

    // Build category list dynamically from constants
    const categoryList = EXERCISE_CATEGORIES.map(
      cat => `- ${cat.value} (${cat.label})`
    ).join('\n')

    const prompt = `Analiza el siguiente nombre de ejercicio y proporciona información detallada en español.
    
    Nombre del archivo: "${fileName}"
    
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
      model: 'qwen/qwen3-32b',
      temperature: 0.7,
      max_tokens: 1500,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta: ' + responseText.substring(0, 100))
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error: any) {
    logError('Error analyzing exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Error al analizar el ejercicio' },
      { status: 500 }
    )
  }
}
