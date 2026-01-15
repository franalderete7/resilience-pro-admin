'use server'

import { authenticateRequest } from '@/lib/auth'
import { getActiveSystemPrompt, createPromptVersion, getPromptHistory, setActiveVersion, PromptVersion } from '@/lib/prompts/prompt-service'
import { auditSystemPrompt, askSystemPrompt } from '@/lib/prompts/prompt-auditor'
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
          // Pass the cookie header for authentication
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

export async function fetchActivePrompt() {
  return await getActiveSystemPrompt()
}

export async function fetchPromptHistory() {
  return await getPromptHistory()
}

export async function analyzePromptModules(
  methodology: string,
  rules: string,
  categories: string
) {
  return await auditSystemPrompt(methodology, rules, categories)
}

export async function askPromptAI(
  question: string,
  methodology: string,
  rules: string,
  categories: string,
  structure: string
) {
  return await askSystemPrompt(question, methodology, rules, categories, structure)
}

export async function saveNewPromptVersion(data: {
  label: string
  methodology: string
  categories: string
  rules: string
  structure: string
  isActive: boolean
}) {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id || null 
    
    await createPromptVersion(userId as any, data)

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
