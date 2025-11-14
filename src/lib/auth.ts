import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export interface AuthenticatedUser {
  id: string
  email: string | null
  role: string
  is_active: boolean
}

export interface AuthResult {
  error: string | null
  user: AuthenticatedUser | null
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing authorization header', user: null }
  }

  const token = authHeader.substring(7)

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return { error: 'Invalid or expired token', user: null }
    }

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return { error: 'User not found', user: null }
    }

    if (!userRecord.is_active) {
      return { error: 'User account is inactive', user: null }
    }

    return {
      error: null,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        is_active: userRecord.is_active,
      },
    }
  } catch (error) {
    return { error: 'Authentication failed', user: null }
  }
}

