import { supabaseAdmin } from '../supabase-admin'
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
  // Goal-specific prompts
  muscle_power_content: string | null
  muscle_mass_content: string | null
  speed_content: string | null
  maintenance_content: string | null
  // Legacy fields (for backwards compatibility during migration)
  methodology_content?: string
  categories_content?: string
  rules_content?: string
  structure_content?: string | null
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
      // Return defaults
      return {
        musclePower: DEFAULT_GOAL_PROMPTS.improve_muscle_power,
        muscleMass: DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
        speed: DEFAULT_GOAL_PROMPTS.improve_speed,
        maintenance: DEFAULT_GOAL_PROMPTS.maintenance
      }
    }

    return {
      musclePower: data.muscle_power_content || DEFAULT_GOAL_PROMPTS.improve_muscle_power,
      muscleMass: data.muscle_mass_content || DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
      speed: data.speed_content || DEFAULT_GOAL_PROMPTS.improve_speed,
      maintenance: data.maintenance_content || DEFAULT_GOAL_PROMPTS.maintenance
    }
  } catch (err) {
    console.error('Unexpected error fetching active prompts:', err)
    return {
      musclePower: DEFAULT_GOAL_PROMPTS.improve_muscle_power,
      muscleMass: DEFAULT_GOAL_PROMPTS.increase_muscle_mass,
      speed: DEFAULT_GOAL_PROMPTS.improve_speed,
      maintenance: DEFAULT_GOAL_PROMPTS.maintenance
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
    musclePower: string
    muscleMass: string
    speed: string
    maintenance: string
    isActive: boolean
  }
) {
  // If setting to active, first deactivate others
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
      muscle_power_content: content.musclePower,
      muscle_mass_content: content.muscleMass,
      speed_content: content.speed,
      maintenance_content: content.maintenance,
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
  // Deactivate all
  await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: false })
    .neq('id', id) // Optimization: usually we'd update all where is_active=true

  // Activate target
  const { error } = await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
}
