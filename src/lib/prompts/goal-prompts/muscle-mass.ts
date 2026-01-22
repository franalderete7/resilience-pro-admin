/**
 * Masa Muscular (Muscle Mass/Hypertrophy) Program Rules
 * 
 * Focus: Muscle hypertrophy, high volume training
 * Key characteristics:
 * - Activations related to the day's focus (chest day = push-ups, leg day = goblet squats)
 * - Block 1 has NO explosive exercises, starts directly with main exercise
 * - High total volume (e.g., 5x6 = 30 total reps)
 * - Block 2: Same movement pattern but unilateral, can combine 2 exercises
 * - Block 3: Core and accessories, up to 3 exercises, always 4 sets, ~8 reps
 */

export const MUSCLE_MASS_DEFAULT = `PROGRAMA: MASA MUSCULAR (HIPERTROFIA)

OBJETIVO: Maximizar el crecimiento muscular mediante alto volumen de entrenamiento y tiempo bajo tensión.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Ejercicios con RELACIÓN DIRECTA al enfoque del día
   - Día de pecho: flexiones de brazos
   - Día de piernas: sentadillas de copa
   - 3-4 ejercicios, 2 sets, 10-15 reps

2. ACTIVACIÓN 2 (warmup):
   - Ejercicios de core y estabilización
   - Preparación articular específica
   - 2-3 ejercicios, 2 sets

3. BLOQUE 1 (main):
   - NO LLEVAR EJERCICIOS EXPLOSIVOS
   - Ir DIRECTAMENTE con el ejercicio principal de la sesión
   - ALTOS VOLÚMENES TOTALES: ejemplo 5 series de 6 repeticiones = 30 reps totales
   - Categorías: hip-dominant, knee-dominant, pushes, pulls (según el día)
   - 1-2 ejercicios principales, 4-5 sets, 6-8 reps

4. BLOQUE 2 (main):
   - MISMO PATRÓN de movimiento que Bloque 1 pero a 1 APOYO (unilateral)
   - Se pueden poner hasta 2 ejercicios que se COMBINEN y POTENCIEN
   - Ejemplo: si Bloque 1 fue sentadilla bilateral, aquí zancada o sentadilla búlgara
   - 2 ejercicios, 3-4 sets, 8-10 reps

5. BLOQUE 3 (main):
   - Ejercicios de CORE y ACCESORIOS
   - Hasta 3 ejercicios
   - SIEMPRE 4 series
   - SIEMPRE repeticiones intermedias: ~8 reps por ejercicio
   - Categorías: core, accessories, isolation exercises
   - 2-3 ejercicios, 4 sets, 8 reps

6. BLOQUE 4 (main):
   - Ejercicios de aislamiento y pump final
   - Enfocarse en músculos trabajados durante la sesión
   - 2-3 ejercicios, 3 sets, 10-12 reps

VOLUMEN Y SERIES:
- Alto volumen total por grupo muscular
- Bloques principales: 4-5 series
- Repeticiones: rango 6-12 según el bloque
- Rest: 60-90 segundos (para mantener tensión metabólica)

PROGRESIÓN:
- Semanas 1-2: Establecer conexión mente-músculo, técnica perfecta
- Semanas 3-4: Aumentar volumen total (más series o reps)
`

export function getMuscleMassPrompt(customContent?: string): string {
  return customContent || MUSCLE_MASS_DEFAULT
}
