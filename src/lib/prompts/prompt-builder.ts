/**
 * Prompt Builder
 * 
 * Combines base prompt with goal-specific prompt to create
 * the final system prompt for program generation.
 */

import { getBasePrompt } from './base-prompt'
import { getGoalPrompt, mapUserGoalsToProgramGoal, type ProgramGoal } from './goal-prompts'

export interface GoalPromptModules {
  musclePower?: string
  muscleMass?: string
  speed?: string
  maintenance?: string
  endurance?: string
  flexibility?: string
  preMatch?: string
  fuerzaSuperior?: string
  fuerzaInferior?: string
}

/**
 * Builds the complete system prompt for program generation.
 * 
 * @param userGoals - Array of user goals from the database
 * @param customGoalPrompts - Optional custom prompts from database (trainer edits)
 * @returns Complete system prompt combining base + goal-specific rules
 */
export function buildProgramPrompt(
  userGoals: string[],
  customGoalPrompts?: GoalPromptModules
): string {
  const basePrompt = getBasePrompt()
  const primaryGoal = mapUserGoalsToProgramGoal(userGoals)
  const customContent = getCustomContentForGoal(primaryGoal, customGoalPrompts)
  const goalPrompt = getGoalPrompt(primaryGoal, customContent)
  
  return `${basePrompt}

${goalPrompt}`.trim()
}

/**
 * Get custom content for a specific goal from the modules.
 */
function getCustomContentForGoal(
  goal: ProgramGoal, 
  customPrompts?: GoalPromptModules
): string | undefined {
  if (!customPrompts) return undefined
  
  switch (goal) {
    case 'improve_muscle_power':
      return customPrompts.musclePower
    case 'increase_muscle_mass':
      return customPrompts.muscleMass
    case 'improve_speed':
      return customPrompts.speed
    case 'maintenance':
      return customPrompts.maintenance
    case 'improve_endurance':
      return customPrompts.endurance
    case 'increase_flexibility':
      return customPrompts.flexibility
    default:
      return undefined
  }
}

/**
 * Get the primary goal label for display purposes.
 */
export function getPrimaryGoalLabel(userGoals: string[]): string {
  const goal = mapUserGoalsToProgramGoal(userGoals)
  
  const labels: Record<ProgramGoal, string> = {
    improve_muscle_power: 'Potencia Muscular',
    increase_muscle_mass: 'Masa Muscular',
    improve_speed: 'Velocidad',
    maintenance: 'Mantenimiento',
    improve_endurance: 'Resistencia',
    increase_flexibility: 'Flexibilidad'
  }
  
  return labels[goal]
}

// Re-export types and utilities
export { type ProgramGoal, mapUserGoalsToProgramGoal } from './goal-prompts'
