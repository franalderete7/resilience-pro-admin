'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export interface User {
  id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  is_premium: boolean
  goal: string | null
  gender: string | null
  height: number | null
  weight: number | null
  weight_goal: number | null
  fitness_level: string | null
  sport: string | null
  sport_level: string | null
  age: number | null
  dominant_side: string | null
  training_place: string | null
  available_equipment: string[] | null
  preferred_days_per_week: number | null
  preferred_session_minutes: number | null
  referral_source: string | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface FetchUsersOptions {
  search?: string
  role?: string
  isPremium?: boolean | null
  goal?: string
  isActive?: boolean | null
  sortBy?: keyof User
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface FetchUsersResult {
  users: User[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Fetch users with filtering, sorting, and pagination
 */
export async function fetchUsers(options: FetchUsersOptions = {}): Promise<FetchUsersResult> {
  const {
    search = '',
    role = '',
    isPremium = null,
    goal = '',
    isActive = null,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 50
  } = options

  try {
    // Build the query
    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (isPremium !== null) {
      query = query.eq('is_premium', isPremium)
    }

    if (goal) {
      query = query.eq('goal', goal)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive)
    }

    // Get total count before pagination
    const { count, error: countError } = await query

    if (countError) {
      console.error('Error counting users:', countError)
      throw new Error('Failed to count users')
    }

    // Apply sorting and pagination
    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
      console.error('Error fetching users:', error)
      throw new Error('Failed to fetch users')
    }

    return {
      users: data as User[],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  } catch (error) {
    console.error('Unexpected error fetching users:', error)
    throw error
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserActive(userId: string, isActive: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user status:', error)
      throw new Error('Failed to update user status')
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error toggling user status:', error)
    throw error
  }
}

/**
 * Toggle user premium status
 */
export async function toggleUserPremium(userId: string, isPremium: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user premium status:', error)
      throw new Error('Failed to update premium status')
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error toggling premium status:', error)
    throw error
  }
}

/**
 * Get unique values for filters
 */
export async function getUserFilterOptions() {
  try {
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('users')
      .select('role')
      .order('role')

    const { data: goals, error: goalsError } = await supabaseAdmin
      .from('users')
      .select('goal')
      .not('goal', 'is', null)
      .order('goal')

    if (rolesError || goalsError) {
      console.error('Error fetching filter options:', rolesError || goalsError)
    }

    const uniqueRoles = [...new Set(roles?.map(r => r.role) || [])]
    const uniqueGoals = [...new Set(goals?.map(g => g.goal).filter(Boolean) || [])]

    return {
      roles: uniqueRoles,
      goals: uniqueGoals
    }
  } catch (error) {
    console.error('Error getting filter options:', error)
    return { roles: [], goals: [] }
  }
}
