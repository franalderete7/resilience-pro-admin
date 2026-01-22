/**
 * Potencia Muscular (Muscle Power) Program Rules
 * 
 * Focus: Explosive movements, power development
 * Key characteristics:
 * - Activations mirror main exercises
 * - Block 1 has explosive patterns similar to main blocks
 * - Block 2: Bilateral exercises, high load + velocity combinations
 * - Block 3: Upper body with same method as Block 2
 * - Block 4: Unilateral exercises (upper + lower) + core
 * - 3-4 sets in main blocks, up to 32 total reps for explosive exercises
 */

export const MUSCLE_POWER_DEFAULT = `PROGRAMA: POTENCIA MUSCULAR

OBJETIVO: Desarrollar la capacidad explosiva y potencia muscular mediante ejercicios de alta velocidad y carga combinados.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Ejercicios similares a los bloques principales
   - Ejemplo: Si el bloque principal tiene sentadillas, usar sentadilla de copa
   - 3-5 ejercicios, 1-2 sets, 8-12 reps

2. ACTIVACIÓN 2 (warmup):
   - Ejercicios de core e isométricos
   - Preparación específica para movimientos explosivos
   - 2-3 ejercicios, 2 sets

3. BLOQUE 1 (main):
   - Ejercicios con patrones SIMILARES a los bloques principales pero EXPLOSIVOS
   - Si el principal del día es sentadilla y press: usar flexiones con despegue y sentadillas con salto
   - Categorías: ballistics, plyometrics, agility, olympic-derivatives
   - 2-3 ejercicios, 3-4 sets

4. BLOQUE 2 (main):
   - Ejercicios a 2 APOYOS (bilaterales)
   - COMBINAR ejercicio de alta carga (ej: sentadilla) con ejercicio veloz (ej: salto al cajón)
   - Usar supersets de fuerza + velocidad
   - Categorías: hip-dominant, knee-dominant con ballistics
   - 2 ejercicios, 3-4 sets

5. BLOQUE 3 (main):
   - Ejercicios de MIEMBRO SUPERIOR
   - Mismo método que Bloque 2: combinar carga + velocidad
   - Categorías: pushes, pulls con ballistics de upper body
   - 2 ejercicios, 3-4 sets

6. BLOQUE 4 (main):
   - Ejercicios a 1 APOYO (unilaterales)
   - Incluir: 1 ejercicio miembro inferior + 1 ejercicio miembro superior + 1 ejercicio core
   - Categorías: unilateral variations, core, accessories
   - 2-3 ejercicios, 2-3 sets

VOLUMEN Y SERIES:
- Bloques principales: 3-4 series
- Ejercicios explosivos: máximo 32 repeticiones totales por ejercicio (ej: 4x8)
- Rest entre ejercicios explosivos: 90-120 segundos

PROGRESIÓN:
- Semanas 1-2: Énfasis en técnica de movimientos explosivos, cargas moderadas
- Semanas 3-4: Aumentar carga manteniendo velocidad de ejecución
`

export function getMusclePowerPrompt(customContent?: string): string {
  return customContent || MUSCLE_POWER_DEFAULT
}
