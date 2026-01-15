import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface AuditResult {
  score: number
  issues: Array<{
    type: 'conflicto' | 'ambigüedad' | 'ineficiencia' | 'sugerencia'
    severity: 'crítico' | 'advertencia' | 'info'
    location: 'methodology' | 'rules' | 'categories'
    description: string
    quote?: string
  }>
  summary: string
}

/**
 * Audits the system prompt modules for logical inconsistencies, conflicts, and clarity.
 */
export async function auditSystemPrompt(
  methodology: string,
  rules: string,
  categories: string
): Promise<AuditResult> {
  const metaPrompt = `Actúa como un Auditor Técnico Senior de Prompts para "Resilience Pro".

TU OBJETIVO:
Analizar quirúrgicamente los prompts del sistema para encontrar errores lógicos, contradicciones fatales y ambigüedades que harían fallar a la IA al generar un programa de entrenamiento.

NO ME DES CONSEJOS GENÉRICOS. No digas "intenta ser más claro".
DIME EXACTAMENTE QUÉ ESTÁ MAL Y DÓNDE.

BUSCA ESPECÍFICAMENTE:
1. CONTRADICCIONES NUMÉRICAS DIRECTAS (CRÍTICO):
   - Ejemplo: "Regla A dice 3 series" VS "Regla B dice 4 series".
   - Ejemplo: "Metodología dice usar solo peso corporal en Bloque 1" VS "Reglas dice usar pesas en Bloque 1".
2. REFERENCIAS ROTAS (CRÍTICO):
   - Mencionar una categoría de ejercicio (ej: 'olympic-lifts') en las Reglas que NO existe en la lista de Categorías.
3. LÓGICA IMPOSIBLE:
   - Pedir 10 ejercicios en un bloque que solo permite 5 minutos de duración.

INPUTS A ANALIZAR:

=== [1. METODOLOGÍA] ===
${methodology}

=== [2. REGLAS] ===
${rules}

=== [3. CATEGORÍAS] ===
${categories}

------------------------------------------------

FORMATO DE SALIDA (JSON EN ESPAÑOL):
{
  "score": <0-100, sé estricto>,
  "summary": "<Resumen profesional y directo de la salud del prompt>",
  "issues": [
    {
      "type": "conflicto" | "ambigüedad" | "ineficiencia" | "sugerencia",
      "severity": "crítico" | "advertencia" | "info",
      "location": "methodology" | "rules" | "categories",
      "description": "<Explicación técnica precisa del error>",
      "quote": "<CITA EXACTA del texto que causa el conflicto>"
    }
  ]
}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'Eres un Auditor de Lógica estricto. Solo hablas JSON. Odias las ambigüedades. Citas siempre el error específico.' 
        },
        { role: 'user', content: metaPrompt },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No analysis generated')

    return JSON.parse(content) as AuditResult
  } catch (error) {
    console.error('Prompt Audit Failed:', error)
    return {
      score: 0,
      summary: 'Error al ejecutar el análisis. Por favor intenta de nuevo.',
      issues: [],
    }
  }
}

/**
 * Allows the user to ask questions about the current system prompt configuration.
 */
export async function askSystemPrompt(
  question: string,
  methodology: string,
  rules: string,
  categories: string,
  structure: string
): Promise<string> {
  const context = `
CONTEXTO DEL SISTEMA ACTUAL (Resilience Pro):

=== METODOLOGÍA ===
${methodology}

=== REGLAS ===
${rules}

=== CATEGORÍAS ===
${categories}

=== ESTRUCTURA JSON ===
${structure}
`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'Eres el asistente experto del sistema de entrenamiento "Resilience Pro". Tienes acceso total a la configuración interna (prompts). Tu trabajo es responder dudas del entrenador sobre cómo está configurada la lógica actual. Responde en Español, sé conciso y cita las partes relevantes si es necesario.' 
        },
        { role: 'user', content: context + '\n\nPREGUNTA DEL USUARIO:\n' + question },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.3,
      max_tokens: 1000,
    })

    return completion.choices[0]?.message?.content || 'No pude generar una respuesta.'
  } catch (error) {
    console.error('Ask System Prompt Failed:', error)
    throw new Error('Error al consultar a la IA.')
  }
}
