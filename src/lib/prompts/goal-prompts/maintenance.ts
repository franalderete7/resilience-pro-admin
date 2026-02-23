/**
 * Mantenimiento (Maintenance) Program Rules
 * 
 * Focus: Maintain fitness level, balanced full-body approach
 * Key characteristics:
 * - Activations similar to main exercises of the day
 * - Intermediate reps (6-8) and sets (3-4)
 * - Always full body: pair lower body with upper body
 * - Accessories target muscles used in the session
 */

export const MAINTENANCE_DEFAULT = `PROGRAMA: MANTENIMIENTO

OBJETIVO: Mantener el nivel de condición física actual con un enfoque equilibrado y sostenible de cuerpo completo.

ESTRUCTURA DE BLOQUES ESPECÍFICA:

1. ACTIVACIÓN 1 (warmup):
   - Movilidad y flexibilidad general (rotaciones articulares, estiramientos dinámicos)
   - Preparación de caderas, hombros, columna
   - 3-4 ejercicios, 2 sets, 10-12 reps

2. ACTIVACIÓN 2 (warmup):
   - Core y estabilización general (plancha, dead bug, bird dog)
   - Ejercicios isométricos de estabilización
   - 2-3 ejercicios, 2 sets

3. BLOQUE 1 (main):
   - Método FULL BODY: combinar 1 ejercicio de miembro INFERIOR con 1 de miembro SUPERIOR
   - Repeticiones INTERMEDIAS: 6-8 reps
   - Series: 3-4
   - Ejemplo: Sentadilla + Press de hombros
   - 2 ejercicios (1 lower + 1 upper), 3-4 sets, 6-8 reps

4. BLOQUE 2 (main):
   - Continuar con método FULL BODY
   - Diferente patrón de movimiento que Bloque 1
   - Ejemplo: Si Bloque 1 fue dominante de rodilla + empuje, aquí dominante de cadera + tracción
   - 2 ejercicios (1 lower + 1 upper), 3-4 sets, 6-8 reps

5. BLOQUE 3 (main):
   - Ejercicios unilaterales o variaciones
   - Mantener balance entre tren superior e inferior
   - 2 ejercicios, 3 sets, 8-10 reps

6. BLOQUE 4 (main):
   - ACCESORIOS de músculos UTILIZADOS en la sesión
   - Si usé dominante de rodilla → incluir trabajo de cuádriceps (ej: extensión de pierna)
   - Si usé ejercicios de empuje → incluir tríceps
   - Si usé ejercicios de tracción → incluir bíceps
   - Lógica: reforzar los músculos que trabajaron en la sesión
   - 2-3 ejercicios, 3 sets, 10-12 reps

VOLUMEN Y SERIES:
- Volumen MODERADO y sostenible
- Series: 3-4 por ejercicio
- Repeticiones: rango intermedio 6-8 en principales, 10-12 en accesorios
- Rest: 60-90 segundos

MÉTODO FULL BODY:
- SIEMPRE alternar entre miembro inferior y miembro superior
- Esto permite recuperación activa y eficiencia de tiempo
- Mantiene el balance muscular general

PROGRESIÓN:
- Semanas 1-2: Establecer rutina, cargas moderadas
- Semanas 3-4: Pequeños incrementos de carga manteniendo el volumen
`

export function getMaintenancePrompt(customContent?: string): string {
  return customContent || MAINTENANCE_DEFAULT
}
