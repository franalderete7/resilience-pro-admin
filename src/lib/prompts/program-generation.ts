/**
 * System prompts for LLM-based program generation.
 * 
 * DEPRECATED: This file is kept for backwards compatibility.
 * New code should use:
 * - src/lib/prompts/base-prompt.ts - Base universal rules
 * - src/lib/prompts/goal-prompts/* - Goal-specific prompts
 * - src/lib/prompts/prompt-builder.ts - Combines base + goal prompts
 * 
 * The prompt system now works as follows:
 * 1. Base prompt contains universal rules (4 weeks, 3 workouts/week, JSON format, etc.)
 * 2. Goal-specific prompts contain specialized training rules for each objective
 * 3. The prompt builder combines them based on user's primary goal
 */

// Legacy exports for backwards compatibility
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
 * @deprecated Use buildProgramPrompt from prompt-builder.ts instead
 */
export function buildSystemPrompt(modules: SystemPromptModules = {}): string {
  console.warn('buildSystemPrompt is deprecated. Use buildProgramPrompt from prompt-builder.ts')
  return ''
}
