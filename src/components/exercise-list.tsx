'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateExerciseAIModal } from '@/components/create-exercise-ai-modal'
import { Sparkles, Trash2, Activity, Dumbbell, ListOrdered, PlayCircle, Tag, BicepsFlexed, Search, X } from 'lucide-react'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '@/lib/constants/exercise-categories'
import { useExercises, useDeleteExercise, useExerciseDetails, type Exercise } from '@/lib/queries/exercises'

// Helper to format description steps
const formatDescription = (description: string | null) => {
  if (!description) return null

  // Check if it's already a list (contains newlines)
  if (description.includes('\n')) {
    return description.split('\n').map((step, i) => (
      <p key={i} className="mb-2 last:mb-0 text-sm sm:text-base leading-relaxed">
        {step}
      </p>
    ))
  }

  // Check if it contains numbered steps (1. Step one 2. Step two...)
  const numberedStepsRegex = /(\d+\.\s+[^0-9]+)/g
  const matches = description.match(numberedStepsRegex)

  if (matches && matches.length > 0) {
    return matches.map((step, i) => (
      <p key={i} className="mb-2 last:mb-0 text-sm sm:text-base leading-relaxed">
        {step.trim()}
      </p>
    ))
  }

  // Default paragraph
  return <p className="text-sm sm:text-base leading-relaxed">{description}</p>
}

export function ExerciseList() {
  const { data: exercises = [], isLoading } = useExercises()
  const deleteExercise = useDeleteExercise()
  
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null)
  const { data: selectedExercise } = useExerciseDetails(selectedExerciseId)
  
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [isCreateAIOpen, setIsCreateAIOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Exercise | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')

  // Filtered exercises using useMemo for performance
  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise: Exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || exercise.category === categoryFilter
      const matchesDifficulty = difficultyFilter === 'all' || exercise.difficulty_level === difficultyFilter
      
      return matchesSearch && matchesCategory && matchesDifficulty
    })
  }, [exercises, searchQuery, categoryFilter, difficultyFilter])

  const handleExerciseClick = (exercise: Exercise) => {
    if (exercise.video_url) {
      setSelectedExerciseId(exercise.exercise_id)
      setVideoError(null)
      setIsVideoOpen(true)
    }
  }

  const handleCreateSuccess = () => {
    // React Query will automatically refetch
  }

  const handleDeleteClick = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation() // Prevent card click
    setDeleteConfirm(exercise)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    try {
      await deleteExercise.mutateAsync(deleteConfirm.exercise_id)
      setDeleteConfirm(null)
    } catch (error: any) {
      console.error('Error deleting exercise:', error)
      alert(`Error al eliminar ejercicio: ${error.message}`)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
    setDifficultyFilter('all')
  }

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-zinc-400">Cargando ejercicios...</p>
      </div>
    )
  }

  return (
    <div className="py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Ejercicios</h2>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            {filteredExercises.length} {filteredExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            {hasActiveFilters && ` de ${exercises.length} total`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setIsCreateAIOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation text-base"
            size="lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Crear con IA
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Buscar ejercicios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all">Todas las categorías</SelectItem>
              {EXERCISE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty Filter */}
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="Dificultad" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all">Todas las dificultades</SelectItem>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-zinc-700 rounded-lg">
          <p className="text-zinc-400 mb-4 text-center">
            {hasActiveFilters ? 'No se encontraron ejercicios con estos filtros' : 'No hay ejercicios aún'}
          </p>
          {hasActiveFilters ? (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Limpiar filtros
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setIsCreateAIOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Crear con IA
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredExercises.map((exercise: Exercise) => (
            <Card
              key={exercise.exercise_id}
              className="bg-zinc-900 border-zinc-800 text-white cursor-pointer hover:border-zinc-700 hover:shadow-xl transition-all duration-300 group flex flex-col relative overflow-hidden"
              onClick={() => handleExerciseClick(exercise)}
            >
              {/* Delete button - top right */}
              <button
                onClick={(e) => handleDeleteClick(e, exercise)}
                disabled={deleteExercise.isPending && deleteConfirm?.exercise_id === exercise.exercise_id}
                className="absolute top-2 right-2 z-20 p-2 rounded-full bg-red-600/90 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                title="Eliminar ejercicio"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Image Container */}
              <div className="aspect-[3/4] w-full overflow-hidden bg-zinc-950 relative">
              {exercise.image_url ? (
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <Dumbbell className="h-12 w-12 text-zinc-700" />
                </div>
                )}
                
                {/* Play Overlay */}
                {exercise.video_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                      <PlayCircle className="h-8 w-8 text-white fill-white/20" />
                    </div>
                    </div>
                  )}

                {/* Category Badge */}
                {exercise.category && (
                  <div className="absolute bottom-2 left-2">
                    <span className="text-[10px] font-medium bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/10 uppercase tracking-wide">
                      {CATEGORY_LABELS[exercise.category] || exercise.category}
                      </span>
                    </div>
                  )}
                </div>

              <CardContent className="p-4">
                <h3 className="text-base font-semibold text-white leading-tight line-clamp-1 group-hover:text-blue-400 transition-colors">
                  {exercise.name}
                </h3>
                {exercise.difficulty_level && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Activity className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400 capitalize">
                      {DIFFICULTY_LABELS[exercise.difficulty_level] || exercise.difficulty_level}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col bg-zinc-900 border-zinc-800 text-white p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-white text-2xl sm:text-3xl font-bold flex items-center gap-2">
              {selectedExercise?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {selectedExercise?.video_url && (
            <div className="aspect-[9/16] max-h-[60vh] w-full max-w-sm mx-auto bg-black rounded-xl overflow-hidden relative shadow-2xl border border-zinc-800">
              {videoError ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-red-400 mb-2">Error al cargar el video</p>
                  <p className="text-zinc-500 text-sm mb-4">{videoError}</p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={selectedExercise.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    >
                      Abrir video en nueva pestaña
                    </a>
                    <button
                      onClick={() => setVideoError(null)}
                      className="text-zinc-400 hover:text-white text-sm underline"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : (
                <video
                  key={selectedExercise.video_url}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full"
                  autoPlay
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const video = e.currentTarget
                    console.error('[Video] Error loading video:', {
                      url: selectedExercise.video_url,
                      error: video.error,
                      networkState: video.networkState,
                      readyState: video.readyState,
                    })
                    // Try without crossOrigin as fallback
                    if (video.crossOrigin === 'anonymous') {
                      console.log('[Video] Retrying without crossOrigin...')
                      video.crossOrigin = ''
                      video.load()
                    } else {
                      setVideoError('No se pudo cargar el video. Intenta abrirlo en una nueva pestaña.')
                    }
                  }}
                  onLoadStart={() => {
                    console.log('[Video] Loading started:', selectedExercise.video_url)
                  }}
                  onCanPlay={() => {
                    console.log('[Video] Can play:', selectedExercise.video_url)
                  }}
                >
                  <source src={selectedExercise.video_url} type="video/mp4" />
                  <source src={selectedExercise.video_url} type="video/quicktime" />
                  <source src={selectedExercise.video_url} type="video/mov" />
                  Tu navegador no soporta el elemento de video.
                </video>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {selectedExercise?.category && (
              <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800/50 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-blue-400" />
                  <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                    Categoría
                  </span>
                </div>
                <p className="text-white text-base font-medium leading-tight">
                  {CATEGORY_LABELS[selectedExercise.category] || selectedExercise.category}
                </p>
              </div>
            )}
            
            {selectedExercise?.difficulty_level && (
              <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800/50 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                    Dificultad
                  </span>
                </div>
                <p className="text-white text-base font-medium leading-tight capitalize">
                  {DIFFICULTY_LABELS[selectedExercise.difficulty_level] || selectedExercise.difficulty_level}
                </p>
              </div>
            )}

            {selectedExercise?.muscle_groups && selectedExercise.muscle_groups.length > 0 && (
              <div className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-800/50 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <BicepsFlexed className="h-4 w-4 text-purple-400" />
                  <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                    Músculos
                  </span>
                </div>
                <p className="text-white text-base font-medium leading-relaxed">
                  {selectedExercise.muscle_groups.join(', ')}
                </p>
              </div>
            )}
          </div>

          {selectedExercise?.description && (
            <div className="mt-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 p-5 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-500/10 p-1.5 rounded-lg">
                  <ListOrdered className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-white text-sm font-bold uppercase tracking-wide">
                  Instrucciones Paso a Paso
                </h3>
              </div>
              <div className="space-y-3 text-zinc-300">
                {formatDescription(selectedExercise.description)}
              </div>
            </div>
          )}

          {selectedExercise?.equipment_needed && selectedExercise.equipment_needed.length > 0 && (
            <div className="mt-4 flex items-start gap-3 bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/30">
              <Dumbbell className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">
                  Equipo Necesario
                </span>
                <p className="text-white text-sm">
                  {selectedExercise.equipment_needed.join(', ')}
                </p>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateExerciseAIModal
        open={isCreateAIOpen}
        onOpenChange={setIsCreateAIOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-zinc-300">
              ¿Estás seguro de que quieres eliminar el ejercicio{' '}
              <span className="font-semibold text-white">{deleteConfirm?.name}</span>?
            </p>
            <p className="text-sm text-zinc-400">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setDeleteConfirm(null)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleteExercise.isPending}
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {deleteExercise.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
