/**
 * Goal-Specific Prompts Index
 *
 * Exports all goal prompts and provides a selector function.
 * Supports all 9 user_goal enum values from the database.
 */

import { getMusclePowerPrompt, MUSCLE_POWER_DEFAULT } from './muscle-power'
import { getMuscleMassPrompt, MUSCLE_MASS_DEFAULT } from './muscle-mass'
import { getSpeedPrompt, SPEED_DEFAULT } from './speed'
import { getMaintenancePrompt, MAINTENANCE_DEFAULT } from './maintenance'
import { getEndurancePrompt, ENDURANCE_DEFAULT } from './endurance'
import { getFlexibilityPrompt, FLEXIBILITY_DEFAULT } from './flexibility'
import { getPreMatchPrompt, PRE_MATCH_DEFAULT } from './pre-match'
import { getFuerzaSuperiorPrompt, FUERZA_SUPERIOR_DEFAULT } from './fuerza-superior'
import { getFuerzaInferiorPrompt, FUERZA_INFERIOR_DEFAULT } from './fuerza-inferior'

// Goal type matching the database user_goal enum
export type ProgramGoal =
  | 'improve_muscle_power'
  | 'increase_muscle_mass'
  | 'improve_speed'
  | 'maintenance'
  | 'improve_endurance'
  | 'increase_flexibility'
  | 'pre_match'
  | 'fuerza_general_miembro_superior'
  | 'fuerza_general_miembro_inferior'

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
  },
  improve_endurance: {
    label: 'Resistencia',
    description: 'Resistencia cardiovascular y muscular',
    icon: '❤️'
  },
  increase_flexibility: {
    label: 'Flexibilidad',
    description: 'Movilidad articular y rango de movimiento',
    icon: '🧘'
  },
  pre_match: {
    label: 'Pre Match',
    description: 'Activación y preparación física pre-competencia',
    icon: '🎯'
  },
  fuerza_general_miembro_superior: {
    label: 'Fuerza - Miembros Superiores',
    description: 'Desarrollo de fuerza general en tren superior',
    icon: '💪'
  },
  fuerza_general_miembro_inferior: {
    label: 'Fuerza - Miembros Inferiores',
    description: 'Desarrollo de fuerza general en tren inferior',
    icon: '🦵'
  }
}

// Default prompts for each goal
export const DEFAULT_GOAL_PROMPTS: Record<ProgramGoal, string> = {
  improve_muscle_power: MUSCLE_POWER_DEFAULT,
  increase_muscle_mass: MUSCLE_MASS_DEFAULT,
  improve_speed: SPEED_DEFAULT,
  maintenance: MAINTENANCE_DEFAULT,
  improve_endurance: ENDURANCE_DEFAULT,
  increase_flexibility: FLEXIBILITY_DEFAULT,
  pre_match: PRE_MATCH_DEFAULT,
  fuerza_general_miembro_superior: FUERZA_SUPERIOR_DEFAULT,
  fuerza_general_miembro_inferior: FUERZA_INFERIOR_DEFAULT
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
    case 'improve_endurance':
      return getEndurancePrompt(customContent)
    case 'increase_flexibility':
      return getFlexibilityPrompt(customContent)
    case 'pre_match':
      return getPreMatchPrompt(customContent)
    case 'fuerza_general_miembro_superior':
      return getFuerzaSuperiorPrompt(customContent)
    case 'fuerza_general_miembro_inferior':
      return getFuerzaInferiorPrompt(customContent)
    default:
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
    'improve_endurance',
    'increase_flexibility',
    'pre_match',
    'fuerza_general_miembro_superior',
    'fuerza_general_miembro_inferior',
    'maintenance'
  ]

  for (const goal of goalPriority) {
    if (userGoals.includes(goal)) {
      return goal
    }
  }

  return 'maintenance'
}

// Re-export individual prompts for direct access
export {
  getMusclePowerPrompt,
  getMuscleMassPrompt,
  getSpeedPrompt,
  getMaintenancePrompt,
  getEndurancePrompt,
  getFlexibilityPrompt,
  getPreMatchPrompt,
  getFuerzaSuperiorPrompt,
  getFuerzaInferiorPrompt,
  MUSCLE_POWER_DEFAULT,
  MUSCLE_MASS_DEFAULT,
  SPEED_DEFAULT,
  MAINTENANCE_DEFAULT,
  ENDURANCE_DEFAULT,
  FLEXIBILITY_DEFAULT,
  PRE_MATCH_DEFAULT,
  FUERZA_SUPERIOR_DEFAULT,
  FUERZA_INFERIOR_DEFAULT
}
