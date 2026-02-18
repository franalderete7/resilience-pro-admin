/**
 * Fuerza General - Miembros Inferiores (Lower Body Strength)
 *
 * Focus: General strength development for lower body
 * Key characteristics:
 * - Focus on tren inferior (lower body)
 * - Squat and hinge patterns
 * - Unilateral work
 * - Posterior chain emphasis
 */

export const FUERZA_INFERIOR_DEFAULT = `PROGRAMA: FUERZA GENERAL - MIEMBROS INFERIORES

OBJETIVO: Desarrollar fuerza general en tren inferior mediante patrones de sentadilla e inclinación hacia adelante, con énfasis en cadena posterior.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 - Movilidad de Cadera y Tobillo (warmup):
   - Movilidad de cadera (90/90, pigeon stretch dinámico)
   - Movilidad de tobillo (knee-to-wall, calf raises)
   - Movilidad de cadera en cuadrupedia (world's greatest stretch)
   - 3-4 ejercicios, 2 sets, 8-10 reps

2. ACTIVACIÓN 2 - Activación Muscular (warmup):
   - Activación glútea (puente de glúteos, clam shells, monster walks)
   - Activación core (plancha, dead bug, bird dog)
   - Movimientos con peso corporal (sentadilla profunda, good morning)
   - 4-5 ejercicios, 2 sets, 10-12 reps

3. BLOQUE 1 - Patrón Dominante de Rodilla (main):
   - Ejercicio principal: Sentadilla (back squat, front squat, o goblet)
   - Variantes según equipo: Split squat, step-ups, lunges con carga
   - Series: 4-5
   - Repeticiones: 4-8 (fuerza) o 6-10 (fuerza/hipertrofia)
   - Descanso: 2-3 minutos

4. BLOQUE 2 - Patrón Dominante de Cadera (main):
   - Ejercicio principal: Peso muerto o variante (rumano, sumo, stiff-leg)
   - Variantes: Hip thrust, kettlebell swing, good morning
   - Series: 3-4
   - Repeticiones: 5-8
   - Descanso: 2-3 minutos

5. BLOQUE 3 - Trabajo Unilateral (main):
   - Ejercicios unilaterales: Bulgarian split squat, single-leg RDL, step-ups
   - Enfocar desequilibrios entre piernas
   - Series: 3 por pierna
   - Repeticiones: 6-10 por pierna
   - Descanso: 90 segundos entre series

6. BLOQUE 4 - Cadena Posterior y Core (accessory):
   - Isquiotibiales: Curl nordic o leg curl
   - Glúteos: Hip thrust o glute bridge
   - Pantorrillas: Standing o seated calf raises
   - Core anti-rotación: Paloff press, suitcase carry
   - 4-5 ejercicios, 3 sets, 10-12 reps

REGLAS ESPECÍFICAS:
- PROFUNDIDAD: Priorizar sentadilla profunda con control sobre carga parcial
- RODILLAS: Mantener alineación rodilla en línea con dedos del pie
- CORE: Mantener core rígido en todos los ejercicios
- UNILATERAL: Mínimo 1 ejercicio unilateral por sesión para equilibrio
- PROGRESIÓN: Aumentar carga cuando la técnica sea perfecta en todas las reps
- CADENA POSTERIOR: Mínimo 40% del volumen total debe ser dominante de cadera

ESTRUCTURA SEMANAL:
- 2-3 sesiones de tren inferior por semana
- Mínimo 48 horas de descanso entre sesiones de piernas
- Alternar énfasis: Sesión A (sentadilla), Sesión B (peso muerto)

PRECAUCIONES:
- Calentar adecuadamente antes de cargas pesadas
- Si hay dolor de espalda baja, reducir rango en peso muerto inicialmente
- Priorizar técnica sobre carga siempre
`

export function getFuerzaInferiorPrompt(customContent?: string): string {
  return customContent || FUERZA_INFERIOR_DEFAULT
}
