import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Exercise, ExerciseMinimal } from '@/lib/types/exercise'
import type { ApiResponse } from '@/lib/types/api'
import { logger } from '@/lib/logger'

// Re-export types for convenience
export type { Exercise, ExerciseMinimal } from '@/lib/types/exercise'

/**
 * Fetches exercises from the cached API endpoint.
 * Uses 'minimal' fields by default for optimal performance.
 */
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<ExerciseMinimal[]> => {
      logger.debug('Fetching exercises from API')
      const res = await fetch('/api/exercises?fields=minimal')
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to fetch exercises' }))
        logger.error('Failed to fetch exercises', { status: res.status, error })
        throw new Error(error.error || 'Failed to fetch exercises')
      }
      
      const data: ExerciseMinimal[] = await res.json()
      
      logger.debug('Exercises fetched successfully', { count: data.length })
      return data
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  })
}

/**
 * Fetches full exercise details (including description, video_url, etc.)
 * Used for the exercise detail modal.
 */
export function useExerciseDetails(exerciseId: number | null) {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async (): Promise<Exercise | null> => {
      if (!exerciseId) return null
      
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('exercise_id', exerciseId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!exerciseId, // Only run query if exerciseId is provided
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Mutation for deleting an exercise.
 * Automatically invalidates the exercises cache on success.
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (exerciseId: number) => {
      logger.info('Deleting exercise', { exerciseId })
      
      const res = await fetch(`/api/exercises/${exerciseId}`, { method: 'DELETE' })
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete exercise' }))
        const message = err.error || err.message || 'Failed to delete exercise'
        logger.error('Failed to delete exercise', { exerciseId, status: res.status, message })
        throw new Error(message)
      }
      
      logger.info('Exercise deleted successfully', { exerciseId })
      return exerciseId
    },
    onMutate: async (exerciseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['exercises'] })
      
      // Snapshot previous value
      const previousExercises = queryClient.getQueryData<ExerciseMinimal[]>(['exercises'])
      
      // Optimistically update UI (remove exercise immediately)
      queryClient.setQueryData<ExerciseMinimal[]>(['exercises'], (old) => 
        old?.filter(ex => ex.exercise_id !== exerciseId) ?? []
      )
      
      logger.debug('Optimistically removed exercise from UI', { exerciseId })
      
      return { previousExercises }
    },
    onSettled: async (_, error, exerciseId) => {
      // Always revalidate caches after mutation settles (success or error)
      if (!error) {
        logger.debug('Revalidating caches after delete', { exerciseId })
        
        // Revalidate server-side cache
        const { revalidateExercises } = await import('@/app/actions/revalidate')
        await revalidateExercises()
      }
      
      // Always invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
    onError: (error, exerciseId, context) => {
      logger.error('Delete exercise mutation failed, rolling back', { exerciseId, error })
      
      // Rollback optimistic update on error
      if (context?.previousExercises) {
        queryClient.setQueryData(['exercises'], context.previousExercises)
      }
    },
  })
}

/**
 * Mutation for creating an exercise.
 * Automatically invalidates the exercises cache on success.
 */
export function useCreateExercise() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (exerciseData: Partial<Exercise>) => {
      const { data, error } = await supabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}
