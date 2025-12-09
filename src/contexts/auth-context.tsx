'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface AuthContextType {
  user: User | null
  adminUser: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminUser, setAdminUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const startTime = Date.now()

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) {
            logger.warn('Auth loading timed out, forcing completion', {
              duration: Date.now() - startTime,
            })
            return false
          }
          return prev
        })
      }
    }, 15000) // 15 seconds max load time

    const initAuth = async () => {
      try {
        logger.debug('Starting auth initialization')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error

        if (mounted) {
          if (session?.user) {
            logger.debug('Session found, checking admin role', { userId: session.user.id })
            setUser(session.user)
            await checkAdminRole(session.user.id)
          } else {
            logger.debug('No session found')
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        logger.error('Error getting session:', error)
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      logger.debug('Auth state changed', { event, userId: session?.user?.id })

      setUser(session?.user ?? null)
      if (session?.user) {
        await checkAdminRole(session.user.id)
      } else {
        setAdminUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('role', 'admin')
        .single()

      if (error || !data) {
        // Not an admin, sign out
        logger.warn('User is not an admin, signing out', { userId })
        await supabase.auth.signOut()
        setAdminUser(null)
      } else {
        logger.info('Admin verified', { userId })
        setAdminUser(data)
      }
    } catch (error) {
      logger.error('Error checking admin role:', error)
      await supabase.auth.signOut()
      setAdminUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    logger.debug('Attempting sign in', { email })
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        logger.error('Sign in failed', error)
        setLoading(false)
        return { error }
      }

      if (data.user) {
        logger.debug('Sign in successful, checking admin role', { userId: data.user.id })
        setUser(data.user)
        await checkAdminRole(data.user.id)
      } else {
        logger.warn('Sign in returned no user')
        setLoading(false)
      }

      return { error: null }
    } catch (err) {
      logger.error('Sign in exception', err)
      setLoading(false)
      return { error: err }
    }
  }

  const signOut = async () => {
    logger.debug('Signing out')
    await supabase.auth.signOut()
    setUser(null)
    setAdminUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
