/**
 * Pre Match (Pre Competencia) Program Rules
 *
 * Focus: Activation and preparation before competition
 * Key characteristics:
 * - Low volume, high intent
 * - Neural activation without fatigue
 * - Potentiation exercises
 * - Short duration (20-30 min max)
 */

export const PRE_MATCH_DEFAULT = `PROGRAMA: PRE MATCH / ACTIVACIÓN PRE-COMPETENCIA

OBJETIVO: Activar el sistema nervioso y preparar el cuerpo para la competencia sin generar fatiga. Potenciar el rendimiento inmediato.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN GENERAL (5-7 min):
   - Movilidad articular general
   - Respiración diafragmática
   - Activación glútea ligera
   - 3-4 ejercicios, 1 set, 10-12 reps suaves

2. ACTIVACIÓN NEURAL (5-7 min):
   - Saltos pogo (saltos de canguro)
   - Movimientos balísticos ligeros
   - Aceleraciones cortas (10-20m)
   - 2-3 ejercicios, 2-3 sets, intento MÁXIMO en cada rep

3. POTENCIACIÓN COMPLEJA (8-10 min):
   - Ejercicio de fuerza (1-3 reps al 80-90% 1RM) seguido inmediatamente de:
   - Ejercicio similar potenciado (3-5 reps explosivas)
   - Ejemplo: Sentadilla pesada (2 reps) → Salto al cajón (3 reps)
   - 2-3 pares de ejercicios, 2-3 sets

4. MOVIMIENTOS ESPECÍFICOS (5-7 min):
   - Movimientos del deporte específico a intensidad progresiva
   - Aceleraciones máximas de corta duración
   - Cambios de dirección
   - Técnica deportiva a alta velocidad

REGLAS CRÍTICAS:
- Volumen MUY BAJO: Máximo 20-30 minutos totales
- Repeticiones: 1-5 reps máximo por ejercicio
- Series: 2-3 sets por ejercicio
- Intento MÁXIMO pero con pocas repeticiones
- Descansos: 2-3 minutos completos entre sets
- NO generar fatiga muscular
- Terminar 10-15 minutos ANTES de la competencia
- Foco: Calidad sobre cantidad

TIMING:
- Realizar entre 30-60 minutos antes de la competencia
- Si hay múltiples competencias en el día, repetir antes de cada una
- Ajustar volumen según sensaciones (menor volumen si se siente fatiga residual)
`

export function getPreMatchPrompt(customContent?: string): string {
  return customContent || PRE_MATCH_DEFAULT
}
