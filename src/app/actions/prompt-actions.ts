'use server'

import { getActiveGoalPrompts, createPromptVersion, getPromptHistory, setActiveVersion, PromptVersion } from '@/lib/prompts/prompt-service'
import { DEFAULT_GOAL_PROMPTS, GOAL_METADATA, type ProgramGoal } from '@/lib/prompts/goal-prompts'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.warn('Auth check failed:', error?.message)
      return null
    }
    
    return user
  } catch (e) {
    console.error('Error getting user:', e)
    return null
  }
}

/**
 * Fetch active goal prompts for the UI
 */
export async function fetchActivePrompt() {
  const prompts = await getActiveGoalPrompts()
  return {
    musclePower: prompts.musclePower,
    muscleMass: prompts.muscleMass,
    speed: prompts.speed,
    maintenance: prompts.maintenance
  }
}

/**
 * Get goal metadata for UI labels
 */
export async function fetchGoalMetadata() {
  return GOAL_METADATA
}

/**
 * Get default prompts for reset functionality
 */
export async function fetchDefaultPrompts() {
  return DEFAULT_GOAL_PROMPTS
}

export async function fetchPromptHistory() {
  return await getPromptHistory()
}

/**
 * Save new goal prompts version
 */
export async function saveNewPromptVersion(data: {
  label: string
  musclePower: string
  muscleMass: string
  speed: string
  maintenance: string
  isActive: boolean
}) {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id || null 
    
    await createPromptVersion(userId, data)

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to save prompt version:', error)
    throw new Error(error.message || 'Failed to save prompt')
  }
}

export async function activatePromptVersion(id: string) {
  await setActiveVersion(id)
  revalidatePath('/')
  return { success: true }
}
