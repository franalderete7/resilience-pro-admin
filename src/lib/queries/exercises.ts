import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Exercise {
  exercise_id: number
  name: string
  description?: string | null
  video_url?: string | null
  image_url?: string | null
  category?: string | null
  muscle_groups?: string[] | null
  equipment_needed?: string[] | null
  difficulty_level?: string | null
  created_at?: string
}

/**
 * Fetches exercises from the cached API endpoint.
 * Uses 'minimal' fields by default for optimal performance.
 */
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const res = await fetch('/api/exercises?fields=minimal')
      if (!res.ok) {
        throw new Error('Failed to fetch exercises')
      }
      return res.json()
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
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('exercise_id', exerciseId)
      
      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch exercises list
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
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
