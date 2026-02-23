/**
 * Velocidad (Speed) Program Rules
 * 
 * Focus: Speed development, ballistic movements
 * Key characteristics:
 * - Activations are simple exercises with many reps (low-frequency plyometrics)
 * - Main blocks combine ballistic exercises of high and low load
 * - Always paired with high-velocity demand exercises
 * - Example: scissor second tempo combined with box jumps or accelerations
 */

export const SPEED_DEFAULT = `PROGRAMA: MEJORA DE VELOCIDAD

OBJETIVO: Desarrollar la velocidad de movimiento y capacidad reactiva mediante ejercicios balísticos y de alta demanda de velocidad.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Movilidad y flexibilidad dinámica (skipping suave, saltos pequeños, rotaciones)
   - Pliométricos de BAJA FRECUENCIA (bajo impacto)
   - 4-5 ejercicios, 1-2 sets, 15-20 reps

2. ACTIVACIÓN 2 (warmup):
   - Core e isométricos para estabilización
   - Activación neural con movimientos rápidos de bajo impacto
   - 2-3 ejercicios, 2 sets, 10-12 reps

3. BLOQUE 1 (main):
   - Ejercicios BALÍSTICOS combinando MUCHA CARGA y POCA CARGA
   - SIEMPRE combinar con ejercicios de ALTA DEMANDA DE VELOCIDAD
   - Ejemplo: 2do tiempo en tijera combinado con saltos al cajón
   - Ejemplo: sentadilla con salto + aceleraciones
   - Categorías: ballistics, plyometrics, agility
   - 2-3 ejercicios en superset, 3-4 sets

4. BLOQUE 2 (main):
   - Continuar con combinaciones de carga + velocidad
   - Enfoque en miembro inferior
   - Ejercicios de potencia reactiva
   - Categorías: olympic-derivatives, plyometrics, agility
   - 2 ejercicios, 3-4 sets, 4-6 reps (máxima velocidad)

5. BLOQUE 3 (main):
   - Ejercicios de velocidad para miembro superior
   - Lanzamientos, empujes explosivos
   - Categorías: ballistics upper body, medicine ball throws
   - 2 ejercicios, 3 sets, 6-8 reps

6. BLOQUE 4 (main):
   - Aceleraciones y sprints cortos
   - Ejercicios de agilidad y cambios de dirección
   - Core anti-rotación para transferencia
   - Categorías: agility, sprints, core
   - 2-3 ejercicios, 2-3 sets

VOLUMEN Y SERIES:
- Bajo volumen, MÁXIMA INTENSIDAD de velocidad
- Series: 3-4 por ejercicio
- Repeticiones: bajas (4-8) para mantener calidad de velocidad
- Rest: 90-180 segundos (recuperación completa del sistema neural)

PROGRESIÓN:
- Semanas 1-2: Técnica de movimientos balísticos, coordinación
- Semanas 3-4: Aumentar velocidad de ejecución y carga en ejercicios combinados
`

export function getSpeedPrompt(customContent?: string): string {
  return customContent || SPEED_DEFAULT
}
