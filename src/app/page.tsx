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
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">ResiliencePro Admin</h1>
            <p className="text-sm text-zinc-400">Panel de Administración</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 hidden sm:inline">
              {adminUser.email || adminUser.username}
            </span>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto">
        <ExerciseList />
      </main>
    </div>
  )
}