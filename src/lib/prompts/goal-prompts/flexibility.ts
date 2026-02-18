/**
 * Flexibilidad (Flexibility) Program Rules
 * 
 * Focus: Range of motion, mobility, and flexibility
 * Key characteristics:
 * - Extended warmup with dynamic stretching
 * - Main blocks include mobility-focused strength exercises
 * - Full range of motion emphasis in all movements
 * - Lower loads, controlled tempo, longer holds
 */

export const FLEXIBILITY_DEFAULT = `PROGRAMA: FLEXIBILIDAD

OBJETIVO: Mejorar la flexibilidad y movilidad articular mediante ejercicios de rango completo de movimiento con énfasis en control y tempo.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Movilidad articular dinámica extendida
   - Ejercicios de rango de movimiento progresivo
   - Enfoque en caderas, hombros, columna torácica y tobillos
   - 4-5 ejercicios, 2 sets, 10-12 reps

2. ACTIVACIÓN 2 (warmup):
   - Core con énfasis en estabilización y control motor
   - Ejercicios isométricos con foco en postura y alineación
   - 2-3 ejercicios, 2 sets

3. BLOQUE 1 (main):
   - Ejercicios de RANGO COMPLETO de movimiento
   - Dominante de cadera y rodilla con énfasis en profundidad y control
   - Tempo controlado: bajar en 3 segundos, subir en 2
   - Cargas MODERADAS-BAJAS para permitir rango completo
   - 2-3 ejercicios, 3 sets, 8-10 reps

4. BLOQUE 2 (main):
   - Ejercicios de tren superior con rango completo
   - Empujes y tracciones con énfasis en la fase excéntrica
   - Incluir variaciones que desafíen la movilidad (ej: press por encima de cabeza)
   - 2-3 ejercicios, 3 sets, 8-10 reps

5. BLOQUE 3 (main):
   - Ejercicios UNILATERALES para corregir asimetrías
   - Trabajo de estabilización en posiciones de rango final
   - Zancadas, sentadillas búlgaras, remos a un brazo
   - 2-3 ejercicios, 3 sets, 8-10 reps por lado

6. BLOQUE 4 (main):
   - Movilidad específica y ejercicios correctivos
   - Combinación de movilidad activa con fortalecimiento en rango final
   - Ejercicios de yoga/pilates adaptados si están disponibles
   - 2-3 ejercicios, 2-3 sets, 10-12 reps

VOLUMEN Y SERIES:
- Volumen MODERADO con cargas bajas-moderadas
- Series: 3 por ejercicio
- Repeticiones: 8-12 con tempo controlado
- Rest: 60-90 segundos (permitir recuperación para mantener calidad de movimiento)

PROGRESIÓN:
- Semanas 1-2: Establecer rangos de movimiento, cargas ligeras, aprender tempos
- Semanas 3-4: Incrementar rango y control, pequeños incrementos de carga
`

export function getFlexibilityPrompt(customContent?: string): string {
  return customContent || FLEXIBILITY_DEFAULT
}
