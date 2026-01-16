'use server'

import { revalidateTag } from 'next/cache'

/**
 * Revalidate exercises cache after mutations
 * Uses 'max' profile for stale-while-revalidate semantics
 */
export async function revalidateExercises() {
  revalidateTag('exercises', 'max')
}
