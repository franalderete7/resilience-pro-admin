/**
 * Exercise categories with their Supabase enum values and Spanish display labels.
 * 
 * Supabase enum values:
 * - accessories
 * - agility
 * - ballistics and plyometrics
 * - core
 * - hip-dominant
 * - knee-dominant
 * - pushes
 * - isometrics
 * - mobility and flexibility
 * - running technique
 * - pulls
 */

export interface ExerciseCategory {
  value: string
  label: string
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  { value: 'accessories', label: 'Accesorios' },
  { value: 'accelerations', label: 'Aceleraciones' },
  { value: 'agility', label: 'Agilidad' },
  { value: 'ballistics and plyometrics', label: 'Balísticos y Plyo' },
  { value: 'core', label: 'Core' },
  { value: 'olympic-derivatives', label: 'Derivados de Olímpicos' },
  { value: 'hip-dominant', label: 'Dominante de Cadera' },
  { value: 'knee-dominant', label: 'Dominante de Rodilla' },
  { value: 'ankle-dominant', label: 'Dominante de Tobillo' },
  { value: 'pushes', label: 'Empujes' },
  { value: 'isometrics', label: 'Isos' },
  { value: 'mobility and flexibility', label: 'Movilidad y Flexibilidad' },
  { value: 'running technique', label: 'Técnicas de Carrera' },
  { value: 'pulls', label: 'Tracciones' },
]

/**
 * Map of Supabase enum values to Spanish display labels.
 * Used for displaying category names in the UI.
 */
export const CATEGORY_LABELS: Record<string, string> = EXERCISE_CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.value] = cat.label
    return acc
  },
  {} as Record<string, string>
)

/**
 * Difficulty levels with their Supabase enum values and Spanish display labels.
 */
export interface DifficultyLevel {
  value: string
  label: string
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

/**
 * Map of Supabase enum values to Spanish display labels for difficulty levels.
 */
export const DIFFICULTY_LABELS: Record<string, string> = DIFFICULTY_LEVELS.reduce(
  (acc, level) => {
    acc[level.value] = level.label
    return acc
  },
  {} as Record<string, string>
)

/**
 * Valid weight levels for exercises.
 */
export const WEIGHT_LEVELS = ['no_weight', 'light', 'medium', 'heavy'] as const
export type WeightLevel = typeof WEIGHT_LEVELS[number]

/**
 * Valid block types for workout blocks.
 */
export const BLOCK_TYPES = ['warmup', 'main', 'cooldown', 'superset', 'circuit', 'standard'] as const
export type BlockType = typeof BLOCK_TYPES[number]

/**
 * Program configuration constants.
 */
export const PROGRAM_CONFIG = {
  DURATION_WEEKS: 12,
  WORKOUTS_PER_WEEK: 3,
  TOTAL_WORKOUTS: 36, // 12 weeks * 3 workouts per week
} as const

