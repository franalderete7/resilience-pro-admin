'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2 } from 'lucide-react'

const exerciseCategories = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibilidad' },
  { value: 'plyometrics', label: 'Pliometría' },
  { value: 'balance', label: 'Balance' },
  { value: 'power', label: 'Potencia' },
  { value: 'endurance', label: 'Resistencia' },
  { value: 'mobility', label: 'Movilidad' },
]

const difficultyLevels = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

interface CreateExerciseAIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateExerciseAIModal({ open, onOpenChange, onSuccess }: CreateExerciseAIModalProps) {
  const { adminUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [] as string[],
    difficulty_level: '',
    muscle_groups: '',
    equipment_needed: '',
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [analyzed, setAnalyzed] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0])
      setAnalyzed(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
      setAnalyzed(false)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const analyzeWithAI = async () => {
    if (!videoFile) {
      setError('Por favor sube un video primero')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('video', videoFile)
      if (imageFile) {
        formDataToSend.append('image', imageFile)
      }

      const response = await fetch('/api/analyze-exercise', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        throw new Error('Error al analizar el ejercicio')
      }

      const result = await response.json()
      const data = result.data

      // Pre-fill form with AI results
      setFormData({
        name: data.name || '',
        description: data.description || '',
        categories: data.categories || [],
        difficulty_level: data.difficulty_level || '',
        muscle_groups: Array.isArray(data.muscle_groups) 
          ? data.muscle_groups.join(', ') 
          : '',
        equipment_needed: Array.isArray(data.equipment_needed) 
          ? data.equipment_needed.join(', ') 
          : '',
      })

      setAnalyzed(true)
    } catch (err: any) {
      setError(err.message || 'Error al analizar con IA')
    } finally {
      setAnalyzing(false)
    }
  }

  const uploadFile = async (
    file: File,
    bucket: string,
    fileName: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      return null
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categories: [],
      difficulty_level: '',
      muscle_groups: '',
      equipment_needed: '',
    })
    setVideoFile(null)
    setImageFile(null)
    setError(null)
    setAnalyzed(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let videoUrl = null
      let imageUrl = null

      // Upload video
      if (videoFile) {
        const fileName = `${Date.now()}-${videoFile.name}`
        videoUrl = await uploadFile(videoFile, 'exercise-videos', fileName)
        if (!videoUrl) {
          throw new Error('Error al subir el video')
        }
      }

      // Upload image if provided
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`
        imageUrl = await uploadFile(imageFile, 'exercise-images', fileName)
        if (!imageUrl) {
          throw new Error('Error al subir la imagen')
        }
      }

      // Parse arrays
      const muscleGroups = formData.muscle_groups
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
      const equipmentNeeded = formData.equipment_needed
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      // Use first category for the category field (database expects single value)
      const primaryCategory = formData.categories[0] || null

      // Create exercise record
      const { error: insertError } = await supabase.from('exercises').insert({
        name: formData.name,
        description: formData.description || null,
        video_url: videoUrl,
        image_url: imageUrl,
        category: primaryCategory,
        muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
        equipment_needed: equipmentNeeded.length > 0 ? equipmentNeeded : null,
        difficulty_level: formData.difficulty_level || null,
        created_by: adminUser?.id,
      })

      if (insertError) throw insertError

      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Error al crear el ejercicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            Crear Ejercicio con IA
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Sube los archivos y deja que la IA complete los detalles
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="space-y-2">
              <Label htmlFor="video" className="text-white">
                Video del Ejercicio *
              </Label>
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                required
                className="bg-zinc-800 border-zinc-700 text-white h-10 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200 file:h-full"
              />
              {videoFile && (
                <p className="text-xs text-zinc-400">{videoFile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-white">
                Imagen (opcional)
              </Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="bg-zinc-800 border-zinc-700 text-white h-10 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200 file:h-full"
              />
              {imageFile && (
                <p className="text-xs text-zinc-400">{imageFile.name}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={analyzeWithAI}
              disabled={!videoFile || analyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analizar con IA
                </>
              )}
            </Button>
          </div>

          {/* Form Fields - Enabled after analysis */}
          <div className={`space-y-4 ${!analyzed ? 'opacity-50' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Nombre del Ejercicio *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={!analyzed}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Analiza primero con IA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Descripción
              </Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                disabled={!analyzed}
                className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50"
                placeholder="Analiza primero con IA"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Categorías</Label>
              <div className="flex flex-wrap gap-2">
                {exerciseCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.value)}
                    disabled={!analyzed}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.categories.includes(cat.value)
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-white border border-zinc-700'
                    } disabled:opacity-50`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty_level" className="text-white">
                Dificultad
              </Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) =>
                  setFormData({ ...formData, difficulty_level: value })
                }
                disabled={!analyzed}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscle_groups" className="text-white">
                Grupos Musculares (separados por coma)
              </Label>
              <Input
                id="muscle_groups"
                name="muscle_groups"
                value={formData.muscle_groups}
                onChange={handleInputChange}
                disabled={!analyzed}
                placeholder="pecho, hombros, tríceps"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment_needed" className="text-white">
                Equipo Necesario (separado por coma)
              </Label>
              <Input
                id="equipment_needed"
                name="equipment_needed"
                value={formData.equipment_needed}
                onChange={handleInputChange}
                disabled={!analyzed}
                placeholder="mancuernas, banco"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !analyzed}
              className="flex-1 bg-white text-black hover:bg-zinc-200"
            >
              {loading ? 'Creando...' : 'Crear Ejercicio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
