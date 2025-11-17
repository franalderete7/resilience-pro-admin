'use client'

import { useAuth } from '@/contexts/auth-context'
import { SignInModal } from '@/components/sign-in-modal'
import { ExerciseList } from '@/components/exercise-list'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { adminUser, loading, signOut } = useAuth()

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

      <main className="container mx-auto px-4 sm:px-6 pb-safe">
        <ExerciseList />
      </main>
    </div>
  )
}