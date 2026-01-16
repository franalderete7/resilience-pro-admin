'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Revalidate exercises cache after mutations
 * Uses both path and tag revalidation for maximum compatibility
 */
export async function revalidateExercises() {
  // Revalidate the API route path
  revalidatePath('/api/exercises')
  
  // Also revalidate by tag (if using unstable_cache)
  revalidateTag('exercises', 'max')
}
