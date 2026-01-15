/**
 * Reusable Loading State Components
 * 
 * Consistent loading indicators across the app
 */

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`} />
  )
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="text-zinc-400 mt-4">{message}</p>
      </div>
    </div>
  )
}

export function PageLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-white mt-6 text-lg">Cargando...</p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
      <div className="aspect-[3/4] bg-zinc-800 rounded-lg mb-3"></div>
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
