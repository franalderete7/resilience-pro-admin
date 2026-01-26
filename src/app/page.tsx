'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { SignInModal } from '@/components/sign-in-modal'
import { ExerciseList } from '@/components/exercise-list'
import { AiConfigDashboard } from '@/components/ai-config-dashboard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorBoundary } from '@/components/error-boundary'
import { LoadingState } from '@/components/ui/loading-states'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { adminUser, loading, signOut } = useAuth()

  // Check for password reset errors and redirect to reset password page
  useEffect(() => {
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    
    // Also check hash
    const hash = window.location.hash
    let hashError: string | null = null
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      hashError = hashParams.get('error')
    }

    if ((error || hashError) && (errorCode === 'otp_expired' || errorCode === 'token_not_found')) {
      // Redirect to reset password page with error params
      const params = new URLSearchParams()
      if (error) params.set('error', error)
      if (errorCode) params.set('error_code', errorCode)
      if (searchParams.get('error_description')) {
        params.set('error_description', searchParams.get('error_description')!)
      }
      
      router.replace(`/reset-password?${params.toString()}${hash ? '#' + hash.substring(1) : ''}`)
    }
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <SignInModal />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95 safe-area-top">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">ResiliencePro Admin</h1>
            <p className="text-xs sm:text-sm text-zinc-400 hidden sm:block">Panel de Administración</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-zinc-400 text-sm truncate flex-1 sm:flex-none hidden md:inline">
              {adminUser.email || adminUser.username}
            </span>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800 cursor-pointer text-sm sm:text-base px-3 sm:px-4 py-2 min-h-[44px] touch-manipulation"
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pb-safe pt-6">
        <Tabs defaultValue="exercises" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-800 mb-6">
            <TabsTrigger value="exercises">Base de Datos Ejercicios</TabsTrigger>
            <TabsTrigger value="ai-config">Configuración IA</TabsTrigger>
          </TabsList>
          
          <TabsContent value="exercises">
            <ErrorBoundary>
              <Suspense fallback={<LoadingState message="Cargando ejercicios..." />}>
                <ExerciseList />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="ai-config">
            <ErrorBoundary>
              <Suspense fallback={<LoadingState message="Cargando configuración..." />}>
                <AiConfigDashboard />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}