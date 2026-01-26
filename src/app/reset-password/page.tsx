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
    // Check if we have a token in the URL
    // Supabase sends it as hash fragment: #access_token=...&type=recovery
    const hash = window.location.hash
    const urlParams = new URLSearchParams(hash.substring(1))
    const accessToken = urlParams.get('access_token')
    const type = urlParams.get('type')

    // Also check query params (some configurations use ?token=...)
    const queryToken = searchParams.get('token')

    if (!accessToken && !queryToken) {
      setTokenValid(false)
      setError('No se encontró un token de recuperación válido en la URL.')
      return
    }

    if (type !== 'recovery' && !queryToken) {
      setTokenValid(false)
      setError('El tipo de token no es válido para recuperación de contraseña.')
      return
    }

    setTokenValid(true)
  }, [searchParams])

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
      // Get token from URL hash or query params
      const hash = window.location.hash
      const urlParams = new URLSearchParams(hash.substring(1))
      const accessToken = urlParams.get('access_token') || searchParams.get('token')

      if (!accessToken) {
        throw new Error('Token no encontrado')
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      // Success!
      setSuccess(true)
      setLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      let errorMessage = 'Error al restablecer la contraseña'
      
      if (err.message?.includes('expired') || err.message?.includes('invalid')) {
        errorMessage = 'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.'
      } else if (err.message) {
        errorMessage = err.message
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
