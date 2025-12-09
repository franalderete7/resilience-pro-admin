'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignInModal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, loading: authLoading, adminUser } = useAuth()

  // Log state changes for debugging
  useEffect(() => {
    console.log('[SignInModal] State:', { isSubmitting, authLoading, hasAdminUser: !!adminUser })
  }, [isSubmitting, authLoading, adminUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    console.log('[SignInModal] Submitting sign in...')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        console.log('[SignInModal] Sign in error:', error)
        setError(error.message || 'Error al iniciar sesión')
        setIsSubmitting(false)
      } else {
        console.log('[SignInModal] Sign in successful, waiting for auth state update...')
        // Don't set isSubmitting to false here - let the auth context handle the transition
      }
    } catch (err: any) {
      console.error('[SignInModal] Exception:', err)
      setError(err.message || 'Error inesperado')
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || authLoading

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Iniciar Sesión</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Ingresa con tus credenciales de administrador para acceder al panel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md p-2">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-zinc-200"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
