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

    // Safety timeout to prevent infinite loading (silent - not an error, just a fallback)
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) {
            // Silent fallback - just show login screen
            return false
          }
          return prev
        })
      }
    }, 5000) // 5 seconds max load time

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error

        if (mounted) {
          clearTimeout(loadingTimeout) // Clear timeout since we got a response
          if (session?.user) {
            setUser(session.user)
            await checkAdminRole(session.user)
          } else {
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        // Silent failure - just show login screen
        if (mounted) {
          clearTimeout(loadingTimeout)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setUser(session?.user ?? null)
      if (session?.user) {
        await checkAdminRole(session.user)
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

  const checkAdminRole = async (user: User) => {
    try {
      // For now, any authenticated user is considered an admin
      // You can add role checking later when you have a users table
      setAdminUser({
        id: user.id,
        email: user.email,
        role: 'admin', // Assume admin for now
      })
    } catch (error) {
      // Silent failure - just show login screen
      setAdminUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        return { error }
      }

      if (data.user) {
        setUser(data.user)
        // checkAdminRole will be called by onAuthStateChange listener
        // Just wait a bit for it to complete
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        setLoading(false)
      }

      return { error: null }
    } catch (err) {
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
