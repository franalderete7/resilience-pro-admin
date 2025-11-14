import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const imageFile = formData.get('image') as File | null

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Se requiere un archivo de video' },
        { status: 400 }
      )
    }

    // Extract filename without extension
    const videoFileName = videoFile.name.replace(/\.[^/.]+$/, '')
    const imageFileName = imageFile?.name.replace(/\.[^/.]+$/, '') || ''

    // Use the filename as the primary source
    const fileName = videoFileName || imageFileName

    const prompt = `Analiza el siguiente nombre de ejercicio y proporciona información detallada en español.

Nombre del archivo: "${fileName}"

Basándote en el nombre del ejercicio, genera la siguiente información en formato JSON:

{
  "name": "Nombre del ejercicio en español (limpio y formateado)",
  "description": "Descripción detallada del ejercicio en español (2-3 oraciones explicando cómo se realiza, qué trabaja y beneficios)",
  "categories": ["categoría1", "categoría2"],
  "difficulty_level": "beginner|intermediate|advanced",
  "muscle_groups": ["grupo muscular 1", "grupo muscular 2"],
  "equipment_needed": ["equipo 1", "equipo 2"]
}

Categorías válidas (puedes seleccionar múltiples):
- strength (fuerza)
- cardio
- flexibility (flexibilidad)
- plyometrics (pliometría)
- balance
- power (potencia)
- endurance (resistencia)
- mobility (movilidad)

Niveles de dificultad:
- beginner (principiante)
- intermediate (intermedio)
- advanced (avanzado)

Instrucciones:
1. El nombre debe estar limpio (sin guiones, abreviaciones claras)
2. La descripción debe ser informativa y en español
3. Selecciona las categorías más apropiadas (puede ser más de una)
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
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta')
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error: any) {
    console.error('Error analyzing exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Error al analizar el ejercicio' },
      { status: 500 }
    )
  }
}

