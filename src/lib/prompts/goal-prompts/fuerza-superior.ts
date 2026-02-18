/**
 * Fuerza General - Miembros Superiores (Upper Body Strength)
 *
 * Focus: General strength development for upper body
 * Key characteristics:
 * - Focus on tren superior (upper body)
 * - Multi-joint compound movements
 * - Progressive overload
 * - Balance push/pull patterns
 */

export const FUERZA_SUPERIOR_DEFAULT = `PROGRAMA: FUERZA GENERAL - MIEMBROS SUPERIORES

OBJETIVO: Desarrollar fuerza general en tren superior mediante ejercicios compuestos y progresión sistemática.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 - Movilidad Torácica y Escapular (warmup):
   - Rotación torácica con extensión
   - Movilidad escapular (shrug circles, wall slides)
   - Aperturas de pecho con banda
   - 3-4 ejercicios, 2 sets, 10-12 reps

2. ACTIVACIÓN 2 - Activación Muscular (warmup):
   - Activación de dorsales (pull-downs ligeros o activación isométrica)
   - Activación de pectorales (push-ups o press ligero)
   - Activación de deltoides (Y-T-W o raises ligeros)
   - 3-4 ejercicios, 2 sets, 12-15 reps

3. BLOQUE 1 - Patrón de Empuje Horizontal (main):
   - Ejercicio principal: Press de pecho (barra, mancuerna, o máquina)
   - Variantes según equipo: Press inclinado, press plano, dips
   - Series: 3-5
   - Repeticiones: 4-8 (fuerza) o 6-10 (hipertrofia/fuerza)
   - Descanso: 2-3 minutos

4. BLOQUE 2 - Patrón de Tracción Horizontal (main):
   - Ejercicio principal: Remo (barra, mancuerna, o máquina)
   - Variantes: Remo pendlay, remo a una mano, seated row
   - Series: 3-5
   - Repeticiones: 6-10
   - Descanso: 2 minutos

5. BLOQUE 3 - Patrón de Empuje Vertical (main):
   - Ejercicio principal: Press de hombros (barra o mancuerna)
   - Variantes: Press Arnold, press militar, push press
   - Series: 3-4
   - Repeticiones: 6-10
   - Descanso: 2 minutos

6. BLOQUE 4 - Patrón de Tracción Vertical (main):
   - Ejercicio principal: Jalón al pecho o dominadas asistidas
   - Variantes: Pull-down, dominadas, lat pulldown
   - Series: 3-4
   - Repeticiones: 6-10
   - Descanso: 2 minutos

7. BLOQUE 5 - Accesorios (accessory):
   - Bíceps: Curl de bíceps (barra o mancuerna)
   - Tríceps: Extensiones o fondos
   - Hombros: Elevaciones laterales o frontales
   - 3-4 ejercicios, 3 sets, 10-12 reps

REGLAS ESPECÍFICAS:
- BALANCE EMPUJE/TRACCIÓN: Mantener proporción 1:1 entre volumen de empuje y tracción
- PROGRESIÓN: Aumentar carga 2.5-5% cuando se completen todas las reps con buena forma
- TÉCNICA: Priorizar rango completo de movimiento sobre carga
- CORE: Mantener activación core en todos los ejercicios de tren superior
- ROTACIÓN: Alternar variantes de ejercicios cada 3-4 semanas

ESTRUCTURA SEMANAL:
- 2-3 sesiones de tren superior por semana
- Mínimo 48 horas de descanso entre sesiones
- Alternar enfasis si hay múltiples sesiones (empuje/tracción)
`

export function getFuerzaSuperiorPrompt(customContent?: string): string {
  return customContent || FUERZA_SUPERIOR_DEFAULT
}
