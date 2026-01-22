/**
 * Goal-Specific Prompts Index
 * 
 * Exports all goal prompts and provides a selector function.
 */

import { getMusclePowerPrompt, MUSCLE_POWER_DEFAULT } from './muscle-power'
import { getMuscleMassPrompt, MUSCLE_MASS_DEFAULT } from './muscle-mass'
import { getSpeedPrompt, SPEED_DEFAULT } from './speed'
import { getMaintenancePrompt, MAINTENANCE_DEFAULT } from './maintenance'

// Goal type matching the database enum
export type ProgramGoal = 
  | 'improve_muscle_power'
  | 'increase_muscle_mass'
  | 'improve_speed'
  | 'maintenance'

// Goal metadata for UI
export const GOAL_METADATA: Record<ProgramGoal, { label: string; description: string; icon: string }> = {
  improve_muscle_power: {
    label: 'Potencia Muscular',
    description: 'Desarrollo de potencia explosiva y fuerza reactiva',
    icon: '⚡'
  },
  increase_muscle_mass: {
    label: 'Masa Muscular',
    description: 'Hipertrofia y ganancia de masa muscular',
    icon: '💪'
  },
  improve_speed: {
    label: 'Velocidad',
    description: 'Mejora de velocidad y capacidad balística',
    icon: '🏃'
  },
  maintenance: {
    label: 'Mantenimiento',
    description: 'Mantener condición física con enfoque full body',
    icon: '🔄'
  }
}

// Default prompts for each goal
export const DEFAULT_GOAL_PROMPTS: Record<ProgramGoal, string> = {
  improve_muscle_power: MUSCLE_POWER_DEFAULT,
  increase_muscle_mass: MUSCLE_MASS_DEFAULT,
  improve_speed: SPEED_DEFAULT,
  maintenance: MAINTENANCE_DEFAULT
}

/**
 * Get the prompt for a specific goal.
 * Uses custom content if provided, otherwise falls back to default.
 */
export function getGoalPrompt(goal: ProgramGoal, customContent?: string): string {
  switch (goal) {
    case 'improve_muscle_power':
      return getMusclePowerPrompt(customContent)
    case 'increase_muscle_mass':
      return getMuscleMassPrompt(customContent)
    case 'improve_speed':
      return getSpeedPrompt(customContent)
    case 'maintenance':
      return getMaintenancePrompt(customContent)
    default:
      // Fallback to maintenance if unknown goal
      return getMaintenancePrompt(customContent)
  }
}

/**
 * Map user goals array to the primary program goal.
 * Takes the first matching goal from the supported list.
 */
export function mapUserGoalsToProgramGoal(userGoals: string[]): ProgramGoal {
  // Priority order for goal mapping
  const goalPriority: ProgramGoal[] = [
    'improve_muscle_power',
    'increase_muscle_mass',
    'improve_speed',
    'maintenance'
  ]
  
  for (const goal of goalPriority) {
    if (userGoals.includes(goal)) {
      return goal
    }
  }
  
  // Default to maintenance if no matching goal found
  return 'maintenance'
}

// Re-export individual prompts for direct access
export { 
  getMusclePowerPrompt, 
  getMuscleMassPrompt, 
  getSpeedPrompt, 
  getMaintenancePrompt,
  MUSCLE_POWER_DEFAULT,
  MUSCLE_MASS_DEFAULT,
  SPEED_DEFAULT,
  MAINTENANCE_DEFAULT
}
