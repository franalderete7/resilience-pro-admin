/**
 * Resistencia (Endurance) Program Rules
 * 
 * Focus: Cardiovascular and muscular endurance
 * Key characteristics:
 * - Higher rep ranges (12-20+)
 * - Shorter rest periods (30-60s)
 * - Circuit-style training in main blocks
 * - Emphasis on sustained effort and work capacity
 */

export const ENDURANCE_DEFAULT = `PROGRAMA: RESISTENCIA

OBJETIVO: Mejorar la resistencia cardiovascular y muscular mediante entrenamiento de alta repetición y descansos cortos.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Movilidad dinámica y ejercicios de preparación cardiovascular
   - Ejercicios de baja intensidad que elevan la frecuencia cardíaca gradualmente
   - 3-5 ejercicios, 2 sets, 10-15 reps

2. ACTIVACIÓN 2 (warmup):
   - Core con énfasis en resistencia (isométricos de mayor duración)
   - Ejercicios de estabilización y control postural
   - 2-3 ejercicios, 2 sets

3. BLOQUE 1 (main):
   - Circuito de cuerpo completo con ejercicios compuestos
   - Repeticiones ALTAS: 12-15 reps
   - Descanso CORTO entre ejercicios: 30-45 segundos
   - Combinar tren superior e inferior para mantener frecuencia cardíaca
   - 3-4 ejercicios, 3 sets

4. BLOQUE 2 (main):
   - Ejercicios de dominante de cadera y rodilla con alto volumen
   - Enfoque en cadenas musculares grandes para mayor gasto energético
   - 2-3 ejercicios, 3-4 sets, 12-15 reps
   - Descanso: 45-60 segundos

5. BLOQUE 3 (main):
   - Ejercicios de tren superior con enfoque en resistencia
   - Alternar empujes y tracciones
   - 2-3 ejercicios, 3 sets, 12-15 reps
   - Descanso: 30-45 segundos

6. BLOQUE 4 (main):
   - Circuito metabólico: combinar accesorios con ejercicios de core
   - Ejercicios de bajo impacto pero alta frecuencia cardíaca
   - 2-3 ejercicios, 2-3 sets, 15-20 reps
   - Descanso: 30 segundos

VOLUMEN Y SERIES:
- Volumen ALTO con cargas moderadas-bajas
- Series: 3-4 por ejercicio
- Repeticiones: 12-20 en principales
- Rest: 30-60 segundos (clave para mantener estímulo cardiovascular)

PROGRESIÓN:
- Semanas 1-2: Adaptar al volumen alto, descansos de 60 segundos
- Semanas 3-4: Reducir descansos a 30-45 segundos, aumentar repeticiones
`

export function getEndurancePrompt(customContent?: string): string {
  return customContent || ENDURANCE_DEFAULT
}
