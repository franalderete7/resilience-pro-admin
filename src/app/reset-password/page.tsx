'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Force Supabase to process any hash fragments immediately
    // This is critical for password reset flows where Supabase redirects with hash
    const processHashFragment = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        console.log('Hash fragment detected, processing...')
        // Supabase should automatically process this with detectSessionInUrl: true
        // But we'll also manually trigger getSession to ensure it's processed
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Session processed from hash fragment')
          setTokenValid(true)
          return true
        }
      }
      return false
    }

    // Try to process hash immediately
    processHashFragment()

    // Listen for auth state changes - Supabase might set session automatically from hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, hasSession: !!session })
      
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || (session && tokenValid === null)) {
        console.log('Password recovery detected via auth state change')
        setTokenValid(true)
      }
    })

    // Function to check for token with retry logic (hash might load after initial render)
    const checkTokenAndErrors = async (retryCount = 0) => {
      // Small delay on retry to allow hash to be set
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Check for Supabase error parameters first
      const error = searchParams.get('error')
      const errorCode = searchParams.get('error_code')
      const errorDescription = searchParams.get('error_description')
      
      // Also check hash for errors
      const hash = window.location.hash
      let hashError: string | null = null
      let hashErrorCode: string | null = null
      let hashErrorDescription: string | null = null
      
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        hashError = hashParams.get('error')
        hashErrorCode = hashParams.get('error_code')
        hashErrorDescription = hashParams.get('error_description')
      }

      // Log full URL details for debugging
      console.log(`Reset password page loaded (attempt ${retryCount + 1}):`, {
        fullUrl: window.location.href,
        hash: window.location.hash,
        hashLength: window.location.hash.length,
        search: window.location.search,
        error,
        errorCode,
        errorDescription,
        hashError,
        hashErrorCode,
        hashErrorDescription,
        // Parse hash to see what's actually there
        hashParams: hash ? Object.fromEntries(new URLSearchParams(hash.substring(1)).entries()) : null,
        // Also check if there's a token in query params (some Supabase configs use this)
        queryParams: Object.fromEntries(searchParams.entries())
      })

      if (error || hashError) {
        setTokenValid(false)
        const finalErrorCode = errorCode || hashErrorCode
        const finalErrorDescription = errorDescription || hashErrorDescription
        
        let errorMessage = 'Error al procesar el enlace de recuperación.'
        
        if (finalErrorCode === 'otp_expired') {
          errorMessage = 'El enlace de recuperación ha expirado. Los enlaces de recuperación son válidos por 1 hora. ⚠️ IMPORTANTE: Si solicitaste múltiples enlaces, asegúrate de usar el ÚLTIMO correo que recibiste, no uno anterior.'
        } else if (finalErrorCode === 'token_not_found') {
          errorMessage = 'El enlace de recuperación no es válido. ⚠️ Si solicitaste múltiples enlaces, usa solo el MÁS RECIENTE. Los enlaces anteriores quedan invalidados cuando solicitas uno nuevo.'
        } else if (finalErrorCode === 'invalid_request' || finalErrorCode === 'redirect_to_not_allowed') {
          errorMessage = '⚠️ CONFIGURACIÓN REQUERIDA: El URL de redirección no está permitido en Supabase. Por favor, agrega "https://resilience-pro-admin.vercel.app/reset-password" a la lista de URLs permitidas en tu dashboard de Supabase (Auth > URL Configuration).'
        } else if (finalErrorDescription) {
          errorMessage = decodeURIComponent(finalErrorDescription)
        } else if (error || hashError) {
          errorMessage = `Error: ${error || hashError}. Código: ${finalErrorCode || 'desconocido'}`
        }
        
        setError(errorMessage)
        return
      }

      // Supabase sends tokens in hash fragment: #access_token=...&type=recovery&refresh_token=...
      // We need to extract the token from the hash and set the session explicitly
      let accessToken: string | null = null
      let refreshToken: string | null = null
      let type: string | null = null

      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        accessToken = hashParams.get('access_token')
        refreshToken = hashParams.get('refresh_token')
        type = hashParams.get('type')
        
        console.log('Hash params extracted:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type: type,
          hashLength: hash.length,
          allHashParams: Object.fromEntries(hashParams.entries())
        })
      }

      // Also check query params (some Supabase configurations or email clients might use this)
      const queryToken = searchParams.get('token') || searchParams.get('access_token')
      const queryType = searchParams.get('type')
      
      // Check for Supabase auth callback format: ?token=xxx&type=recovery
      // This happens when Supabase redirects through their auth server
      console.log('Query params check:', {
        hasToken: !!queryToken,
        queryType: queryType,
        allQueryParams: Object.fromEntries(searchParams.entries())
      })

      // Use whichever token we find
      const token = accessToken || queryToken
      const tokenType = type || queryType

      if (!token) {
        // If no token found and this is first attempt, retry once (hash might load late)
        if (retryCount === 0 && !hash && searchParams.toString() === '') {
          console.log('No token found on first attempt, retrying...')
          setTimeout(() => checkTokenAndErrors(1), 200)
          return
        }
        
        setTokenValid(false)
        // Check if this is a direct visit (no token, no error)
        if (!hash && searchParams.toString() === '') {
          setError('Por favor, haz clic en el enlace del correo electrónico más reciente. Si solicitaste múltiples enlaces, asegúrate de usar el ÚLTIMO que recibiste.')
        } else {
          setError('No se encontró un token de recuperación válido en la URL. Asegúrate de hacer clic en el enlace completo del correo electrónico más reciente. Si el problema persiste, verifica que la URL de redirección esté configurada correctamente en Supabase.')
        }
        return
      }

      // Type should be 'recovery' for password reset
      if (tokenType && tokenType !== 'recovery' && !queryToken) {
        console.warn('Token type is not recovery:', tokenType)
      }

      // Extract token from hash and set the session explicitly
      // This is required because getSession() reads from localStorage, not URL hash
      try {
        // First, check if Supabase already set a session (from auth state change or automatic processing)
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession) {
          console.log('Session already exists, token is valid')
          setTokenValid(true)
          return
        }

        if (accessToken) {
          // Set the session using the access token from the hash fragment
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '', // Refresh token may not always be present
          })

          if (sessionError) {
            console.error('Error setting session from hash:', sessionError)
            setTokenValid(false)
            
            if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid') || sessionError.message?.includes('token')) {
              setError('El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.')
            } else {
              setError(`Error al establecer sesión: ${sessionError.message}`)
            }
            return
          }

          // Verify we have a valid session
          if (sessionData?.session) {
            console.log('Session established successfully from hash token')
            setTokenValid(true)
          } else {
            setTokenValid(false)
            setError('No se pudo establecer una sesión válida. Por favor, solicita un nuevo enlace de recuperación.')
          }
        } else {
          // No token in URL - check if session was set anyway (Supabase might have done it automatically)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (session) {
            console.log('Session found without explicit token - Supabase handled it automatically')
            setTokenValid(true)
            return
          }

          if (sessionError) {
            console.error('Session error when checking token:', sessionError)
            setTokenValid(false)
            if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid')) {
              setError('El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.')
            } else {
              setError(`Error al validar el token: ${sessionError.message}`)
            }
            return
          }

          // No session and no error - token not found
          setTokenValid(false)
          setError('No se pudo establecer una sesión válida. Por favor, solicita un nuevo enlace de recuperación.')
        }
      } catch (err: any) {
        console.error('Error checking token:', err)
        setTokenValid(false)
        setError('Error al verificar el token de recuperación. Por favor, intenta nuevamente o solicita un nuevo enlace.')
      }
    }

    // Check immediately
    checkTokenAndErrors()

    // Also listen for hash changes (in case it loads after initial render)
    const handleHashChange = () => {
      checkTokenAndErrors()
    }
    window.addEventListener('hashchange', handleHashChange)

    // Also check periodically for hash (some browsers/redirects set it after page load)
    let hashCheckInterval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null
    
    hashCheckInterval = setInterval(() => {
      if (window.location.hash) {
        console.log('Hash detected on interval check, re-validating...')
        checkTokenAndErrors()
      }
    }, 500)

    // Clear interval after 5 seconds (don't check forever)
    timeoutId = setTimeout(() => {
      if (hashCheckInterval) clearInterval(hashCheckInterval)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('hashchange', handleHashChange)
      if (hashCheckInterval) clearInterval(hashCheckInterval)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [searchParams, tokenValid])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      // Extract token from hash fragment (Supabase sends it here)
      const hash = window.location.hash
      let accessToken: string | null = null
      let refreshToken: string | null = null

      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        accessToken = hashParams.get('access_token')
        refreshToken = hashParams.get('refresh_token')
      }

      // Fallback to query params if hash doesn't have token
      if (!accessToken) {
        accessToken = searchParams.get('token')
      }

      if (!accessToken) {
        throw new Error('Token no encontrado en la URL. Por favor, solicita un nuevo enlace de recuperación.')
      }

      // Set the session using the token from the URL
      // This is required because the token is in the hash fragment, not localStorage
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error(`Error al establecer sesión: ${sessionError.message}`)
      }

      if (!sessionData?.session) {
        throw new Error('No se pudo establecer una sesión válida. El enlace puede haber expirado.')
      }

      console.log('Session established, updating password for user:', sessionData.session.user.id)

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        throw updateError
      }

      // Success!
      console.log('Password updated successfully')
      setSuccess(true)
      setLoading(false)

      // Sign out to clear the recovery session
      await supabase.auth.signOut()

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      let errorMessage = 'Error al restablecer la contraseña'
      
      if (err.message?.includes('expired') || err.message?.includes('invalid') || err.message?.includes('token')) {
        errorMessage = 'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo desde la app.'
      } else if (err.message) {
        errorMessage = err.message
      } else if (err.error_description) {
        errorMessage = err.error_description
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-400">Verificando token...</p>
        </div>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
        <div className="max-w-md w-full bg-zinc-800 border border-zinc-700 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Enlace Inválido</h1>
          <p className="text-zinc-400 mb-6">{error || 'El enlace de recuperación no es válido o ha expirado.'}</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
        <div className="max-w-md w-full bg-zinc-800 border border-green-700 rounded-xl p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">¡Contraseña Actualizada!</h1>
          <p className="text-zinc-400 mb-6">
            Tu contraseña ha sido restablecida correctamente. Serás redirigido al inicio de sesión...
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
      <div className="max-w-md w-full bg-zinc-800 border border-zinc-700 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-full mb-4">
            <Lock className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Restablecer Contraseña</h1>
          <p className="text-zinc-400 text-sm">
            Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">
              Nueva Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">
              Confirmar Contraseña
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={loading}
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Actualizando...
              </>
            ) : (
              'Restablecer Contraseña'
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer"
            >
              Volver al inicio
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-400">Cargando...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
