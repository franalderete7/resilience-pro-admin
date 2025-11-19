'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreateExerciseModal } from '@/components/create-exercise-modal'
import { CreateExerciseAIModal } from '@/components/create-exercise-ai-modal'
import { Plus, Sparkles, Trash2 } from 'lucide-react'

interface Exercise {
  exercise_id: number
  name: string
  description: string | null
  video_url: string | null
  image_url: string | null
  category: string | null
  muscle_groups: string[] | null
  equipment_needed: string[] | null
  difficulty_level: string | null
  created_at: string
}

const categoryLabels: Record<string, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  flexibility: 'Flexibilidad',
  plyometrics: 'Pliometría',
  balance: 'Balance',
  power: 'Potencia',
  endurance: 'Resistencia',
  mobility: 'Movilidad',
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export function ExerciseList() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateAIOpen, setIsCreateAIOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Exercise | null>(null)

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExerciseClick = (exercise: Exercise) => {
    if (exercise.video_url) {
      setSelectedExercise(exercise)
      setIsVideoOpen(true)
    }
  }

  const handleCreateSuccess = () => {
    fetchExercises()
  }

  const handleDeleteClick = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation() // Prevent card click
    setDeleteConfirm(exercise)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    setDeletingId(deleteConfirm.exercise_id)
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('exercise_id', deleteConfirm.exercise_id)

      if (error) throw error

      // Refresh exercises list
      await fetchExercises()
      setDeleteConfirm(null)
    } catch (error: any) {
      console.error('Error deleting exercise:', error)
      alert(`Error al eliminar ejercicio: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
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
            {exercises.length} {exercises.length === 1 ? 'ejercicio' : 'ejercicios'} en total
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
          <Button
            onClick={() => setIsCreateOpen(true)}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 shadow-lg cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation text-base"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Crear Manual
          </Button>
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-zinc-700 rounded-lg">
          <p className="text-zinc-400 mb-4 text-center">No hay ejercicios aún</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setIsCreateAIOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Crear con IA
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800 cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Manual
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises.map((exercise) => (
            <Card
              key={exercise.exercise_id}
              className="bg-zinc-800 border-zinc-700 text-white cursor-pointer hover:border-zinc-600 hover:shadow-lg transition-all duration-200 group flex flex-col relative"
              onClick={() => handleExerciseClick(exercise)}
            >
              {/* Delete button - top right - always visible on mobile */}
              <button
                onClick={(e) => handleDeleteClick(e, exercise)}
                disabled={deletingId === exercise.exercise_id}
                className="absolute top-2 right-2 z-10 p-2 sm:p-1.5 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Eliminar ejercicio"
              >
                <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>

              {exercise.image_url ? (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-zinc-900">
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-600 text-4xl">💪</span>
                </div>
              )}
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-white text-base font-semibold line-clamp-2 leading-tight mb-1">
                  {exercise.name}
                </CardTitle>
                {exercise.description && (
                  <CardDescription className="text-zinc-400 text-xs line-clamp-2">
                    {exercise.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.category && (
                      <span className="text-white bg-zinc-700 px-2 py-0.5 rounded text-[10px]">
                        {categoryLabels[exercise.category] || exercise.category}
                      </span>
                    )}
                    {exercise.difficulty_level && (
                      <span className="text-white bg-zinc-700 px-2 py-0.5 rounded text-[10px]">
                        {difficultyLabels[exercise.difficulty_level] || exercise.difficulty_level}
                      </span>
                    )}
                  </div>
                  {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">Músculos: </span>
                      <span className="text-white text-[10px]">
                        {exercise.muscle_groups.slice(0, 3).join(', ')}
                        {exercise.muscle_groups.length > 3 && '...'}
                      </span>
                    </div>
                  )}
                  {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">Equipo: </span>
                      <span className="text-white text-[10px]">
                        {exercise.equipment_needed.slice(0, 2).join(', ')}
                        {exercise.equipment_needed.length > 2 && '...'}
                      </span>
                    </div>
                  )}
                  {exercise.video_url && (
                    <div className="pt-1">
                      <span className="text-blue-400 text-[10px] flex items-center gap-1">
                        ▶ Click para ver el video
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-4xl h-full sm:h-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl sm:text-2xl">
              {selectedExercise?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedExercise?.video_url && (
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
              <video
                src={selectedExercise.video_url}
                controls
                className="w-full h-full"
                autoPlay
              >
                Tu navegador no soporta el elemento de video.
              </video>
            </div>
          )}
          {selectedExercise?.description && (
            <p className="text-zinc-300 mt-4">{selectedExercise.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {selectedExercise?.category && (
              <div>
                <span className="text-zinc-500 text-sm">Categoría</span>
                <p className="text-white font-medium">
                  {categoryLabels[selectedExercise.category] || selectedExercise.category}
                </p>
              </div>
            )}
            {selectedExercise?.difficulty_level && (
              <div>
                <span className="text-zinc-500 text-sm">Dificultad</span>
                <p className="text-white font-medium">
                  {difficultyLabels[selectedExercise.difficulty_level] || selectedExercise.difficulty_level}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateExerciseModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

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
                disabled={deletingId !== null}
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {deletingId !== null ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}