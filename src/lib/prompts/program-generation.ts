/**
 * System prompts for LLM-based program generation.
 * 
 * This file contains the system prompt builder used to guide the AI in creating
 * personalized training programs following the Resilience Pro methodology.
 * 
 * NOTE: The actual prompt content is stored in the database (prompt_versions table)
 * and fetched via getActiveSystemPrompt(). The defaults here are minimal fallbacks.
 */

/**
 * Default fallbacks (empty - forces reliance on database prompts)
 */
export const DEFAULT_METHODOLOGY = ``
export const DEFAULT_RULES = ``
export const DEFAULT_CATEGORIES = ``
export const DEFAULT_STRUCTURE = ``

export interface SystemPromptModules {
  methodology?: string;
  categories?: string;
  rules?: string;
  structure?: string;
}

/**
 * Builds the complete system prompt for program generation.
 * Accepts modules from the database to override defaults.
 * 
 * The modules contain:
 * - methodology: Training methodology and block structure
 * - rules: Planning rules by objective and level
 * - categories: Exercise category descriptions
 * - structure: JSON format and validation rules
 */
export function buildSystemPrompt(modules: SystemPromptModules = {}): string {
  const methodology = modules.methodology || DEFAULT_METHODOLOGY;
  const categories = modules.categories || DEFAULT_CATEGORIES;
  const rules = modules.rules || DEFAULT_RULES;
  const structure = modules.structure || DEFAULT_STRUCTURE;

  return `Eres un entrenador personal certificado de Resilience Pro. Diseñas programas de entrenamiento personalizados siguiendo la metodología Resilience Pro.

${methodology}

${rules}

${categories}

${structure}`.trim()
}
