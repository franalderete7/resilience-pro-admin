import { supabaseAdmin } from '../supabase-admin'
import { SystemPromptModules, DEFAULT_METHODOLOGY, DEFAULT_RULES, DEFAULT_CATEGORIES, DEFAULT_STRUCTURE } from './program-generation'

export interface PromptVersion {
  id: string
  created_at: string
  is_active: boolean
  version_label: string | null
  methodology_content: string
  categories_content: string
  rules_content: string
  structure_content: string | null
  updated_by: string | null
}

/**
 * Fetches the currently active system prompt configuration.
 * If no active version is found, returns the default hardcoded values.
 */
export async function getActiveSystemPrompt(): Promise<SystemPromptModules> {
  try {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // If table doesn't exist or no active prompt, return defaults
      // We log but don't throw, to fail gracefully to defaults
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.warn('Error fetching active prompt:', error)
      }
      return {
        methodology: DEFAULT_METHODOLOGY,
        categories: DEFAULT_CATEGORIES,
        rules: DEFAULT_RULES,
        structure: DEFAULT_STRUCTURE
      }
    }

    return {
      methodology: data.methodology_content,
      categories: data.categories_content,
      rules: data.rules_content,
      structure: data.structure_content || DEFAULT_STRUCTURE
    }
  } catch (err) {
    console.error('Unexpected error fetching active prompt:', err)
    return {
      methodology: DEFAULT_METHODOLOGY,
      categories: DEFAULT_CATEGORIES,
      rules: DEFAULT_RULES,
      structure: DEFAULT_STRUCTURE
    }
  }
}

/**
 * Creates a new version of the system prompt.
 */
export async function createPromptVersion(
  userId: string,
  content: {
    label: string
    methodology: string
    categories: string
    rules: string
    structure: string
    isActive: boolean
  }
) {
  // If setting to active, first deactivate others (though we could just order by date)
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
      categories_content: content.categories,
      rules_content: content.rules,
      structure_content: content.structure,
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
