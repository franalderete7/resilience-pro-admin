import { supabaseAdmin } from '../supabase-admin'
import { DEFAULT_METHODOLOGY } from './base-prompt'
import { 
  DEFAULT_GOAL_PROMPTS,
  type ProgramGoal 
} from './goal-prompts'
import { type GoalPromptModules } from './prompt-builder'

export interface PromptVersion {
  id: string
  created_at: string
  is_active: boolean
  version_label: string | null
  methodology_content: string | null
  muscle_power_content: string | null
  muscle_mass_content: string | null
  speed_content: string | null
  maintenance_content: string | null
  endurance_content: string | null
  flexibility_content: string | null
  pre_match_content: string | null
  fuerza_general_miembro_superior_content: string | null
  fuerza_general_miembro_inferior_content: string | null
  updated_by: string | null
}

/**
 * Fetches the currently active goal prompts configuration.
 * Returns custom prompts from database or defaults if not found.
 */
export async function getActiveGoalPrompts(): Promise<GoalPromptModules> {
  try {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching active prompts:', error)
      }
      return {
        methodology: DEFAULT_METHODOLOGY,
        musclePower: DEFAULT_GOAL_PROMPTS.improve_muscle_power,
        muscleMass: DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
        speed: DEFAULT_GOAL_PROMPTS.improve_speed,
        maintenance: DEFAULT_GOAL_PROMPTS.maintenance,
        endurance: DEFAULT_GOAL_PROMPTS.improve_endurance,
        flexibility: DEFAULT_GOAL_PROMPTS.increase_flexibility,
        preMatch: DEFAULT_GOAL_PROMPTS.pre_match,
        fuerzaSuperior: DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_superior,
        fuerzaInferior: DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_inferior
      }
    }

    return {
      methodology: data.methodology_content || DEFAULT_METHODOLOGY,
      musclePower: data.muscle_power_content || DEFAULT_GOAL_PROMPTS.improve_muscle_power,
      muscleMass: data.muscle_mass_content || DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
      speed: data.speed_content || DEFAULT_GOAL_PROMPTS.improve_speed,
      maintenance: data.maintenance_content || DEFAULT_GOAL_PROMPTS.maintenance,
      endurance: data.endurance_content || DEFAULT_GOAL_PROMPTS.improve_endurance,
      flexibility: data.flexibility_content || DEFAULT_GOAL_PROMPTS.increase_flexibility,
      preMatch: data.pre_match_content || DEFAULT_GOAL_PROMPTS.pre_match,
      fuerzaSuperior: data.fuerza_general_miembro_superior_content || DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_superior,
      fuerzaInferior: data.fuerza_general_miembro_inferior_content || DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_inferior
    }
  } catch (err) {
    console.error('Unexpected error fetching active prompts:', err)
    return {
      methodology: DEFAULT_METHODOLOGY,
      musclePower: DEFAULT_GOAL_PROMPTS.improve_muscle_power,
      muscleMass: DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
      speed: DEFAULT_GOAL_PROMPTS.improve_speed,
      maintenance: DEFAULT_GOAL_PROMPTS.maintenance,
      endurance: DEFAULT_GOAL_PROMPTS.improve_endurance,
      flexibility: DEFAULT_GOAL_PROMPTS.increase_flexibility,
      preMatch: DEFAULT_GOAL_PROMPTS.pre_match,
      fuerzaSuperior: DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_superior,
      fuerzaInferior: DEFAULT_GOAL_PROMPTS.fuerza_general_miembro_inferior
    }
  }
}

// Legacy function for backwards compatibility
export async function getActiveSystemPrompt(): Promise<GoalPromptModules> {
  return getActiveGoalPrompts()
}

/**
 * Creates a new version of the goal prompts.
 */
export async function createPromptVersion(
  userId: string | null,
  content: {
    label: string
    methodology: string
    musclePower: string
    muscleMass: string
    speed: string
    maintenance: string
    endurance: string
    flexibility: string
    preMatch: string
    fuerzaSuperior: string
    fuerzaInferior: string
    isActive: boolean
  }
) {
  if (content.isActive) {
    await supabaseAdmin
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('is_active', true)
  }

  const { data, error } = await supabaseAdmin
    .from('prompt_versions')
    .insert({
      version_label: content.label,
      methodology_content: content.methodology,
      muscle_power_content: content.musclePower,
      muscle_mass_content: content.muscleMass,
      speed_content: content.speed,
      maintenance_content: content.maintenance,
      endurance_content: content.endurance,
      flexibility_content: content.flexibility,
      pre_match_content: content.preMatch,
      fuerza_general_miembro_superior_content: content.fuerzaSuperior,
      fuerza_general_miembro_inferior_content: content.fuerzaInferior,
      is_active: content.isActive,
      updated_by: userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetches all prompt versions history.
 */
export async function getPromptHistory() {
  const { data, error } = await supabaseAdmin
    .from('prompt_versions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Sets a specific version as active.
 */
export async function setActiveVersion(id: string) {
  await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: false })
    .neq('id', id)

  const { error } = await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
}
