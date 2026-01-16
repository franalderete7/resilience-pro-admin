'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
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
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '@/lib/constants/exercise-categories'
import type { ExerciseMinimal } from '@/lib/types/exercise'

interface CreateExerciseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateExerciseModal({ open, onOpenChange, onSuccess }: CreateExerciseModalProps) {
  const { adminUser } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty_level: '',
    muscle_groups: '',
    equipment_needed: '',
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [extractedImageFile, setExtractedImageFile] = useState<File | null>(null)
  const [extractingFrame, setExtractingFrame] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const extractFrameFromVideo = async (videoFile: File): Promise<File | null> => {
    // Check if video file is reasonable size (under 100MB for mobile)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (videoFile.size > maxSize) {
      console.warn('Video file too large for mobile extraction:', videoFile.size, 'bytes')
      return null // Skip extraction for large files
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set video attributes for proper loading
      video.muted = true
      video.playsInline = true
      video.preload = 'metadata' // Start with metadata only
      // Don't set crossOrigin for local files - it can cause CORS issues

      // Make video visible but tiny - some browsers need it visible to render frames
      video.style.position = 'fixed'
      video.style.top = '0'
      video.style.left = '0'
      video.style.width = '2px'
      video.style.height = '2px'
      video.style.opacity = '0.01' // Almost invisible but technically visible
      video.style.pointerEvents = 'none'
      video.style.zIndex = '-9999'

      // Add video to DOM temporarily so it can render frames
      document.body.appendChild(video)

      console.log('Starting video frame extraction for:', videoFile.name, 'size:', videoFile.size)

      let objectUrl: string | null = null
      let resolved = false

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = null
        }
        video.src = ''
        video.load()
        // Remove video from DOM
        if (video.parentNode) {
          video.parentNode.removeChild(video)
        }
      }

      const captureFrame = () => {
        try {
          // Ensure video has valid dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Video has invalid dimensions')
          }

          // Set canvas dimensions to video dimensions
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Check if canvas is actually drawn (not black) - sample multiple areas
          const sampleSize = Math.min(200, Math.min(canvas.width, canvas.height))
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
          const pixels = imageData.data
          let totalBrightness = 0
          let pixelCount = 0

          // Calculate average brightness
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i]
            const g = pixels[i + 1]
            const b = pixels[i + 2]
            // Calculate brightness (luminance)
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
            totalBrightness += brightness
            pixelCount++
          }

          const averageBrightness = totalBrightness / pixelCount

          // Log brightness for debugging
          console.log('Frame brightness:', averageBrightness, 'Video dimensions:', video.videoWidth, 'x', video.videoHeight)

          // If average brightness is too low (very dark/black), warn but don't fail
          // Some videos might have dark frames - let user decide
          if (averageBrightness < 3) {
            console.warn('Warning: Extracted frame appears very dark (brightness:', averageBrightness, ')')
            // Don't throw error - let it proceed, user can upload custom image if needed
          }

          // Convert canvas to blob, then to File
          canvas.toBlob(
            (blob) => {
              if (blob && !resolved) {
                resolved = true
                const fileName = videoFile.name.replace(/\.[^/.]+$/, '.jpg')
                const file = new File([blob], fileName, { type: 'image/jpeg' })
                cleanup()
                resolve(file)
              } else if (!resolved) {
                cleanup()
                reject(new Error('Failed to create image blob'))
              }
            },
            'image/jpeg',
            0.92 // Quality
          )
        } catch (error) {
          if (!resolved) {
            resolved = true
            cleanup()
            reject(error)
          }
        }
      }

      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, duration:', video.duration, 'dimensions:', video.videoWidth, 'x', video.videoHeight)

        // For very short videos, seek to 10% of duration, otherwise 1 second or 25%
        const seekTime = video.duration < 2
          ? Math.max(0.1, video.duration * 0.1)
          : Math.min(1, Math.max(0.1, video.duration * 0.25))

        console.log('Seeking to time:', seekTime, 'seconds')
        video.currentTime = seekTime
      }

      video.onseeked = async () => {
        console.log('Video seeked, readyState:', video.readyState, 'dimensions:', video.videoWidth, 'x', video.videoHeight)

        // Wait for video to be ready and have valid dimensions
        const waitForReady = () => {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('Video ready for frame capture')

            // Try to play video briefly to ensure frame is rendered (required by some browsers)
            video.play().then(() => {
              console.log('Video playing briefly for frame rendering')
              // Wait longer for frame to actually render
              setTimeout(() => {
                video.pause()
                console.log('Video paused, capturing frame')
                // Additional delay to ensure frame is fully rendered before capture
                setTimeout(() => {
                  // Double-check video is paused and ready
                  if (video.paused && video.readyState >= 2) {
                    captureFrame()
                  } else {
                    // Wait a bit more
                    setTimeout(() => captureFrame(), 200)
                  }
                }, 300)
              }, 100)
            }).catch((playError) => {
              console.warn('Video play failed:', playError)
              // If play fails, try capturing directly after a delay
              setTimeout(() => {
                console.log('Attempting direct frame capture after play failure')
                captureFrame()
              }, 500)
            })
          } else {
            console.log('Video not ready, waiting...', 'readyState:', video.readyState)
            setTimeout(waitForReady, 200) // Increased delay for mobile
          }
        }
        waitForReady()
      }

      video.onloadeddata = () => {
        // Fallback: if seeked doesn't fire, try capturing at current time
        setTimeout(() => {
          if (!resolved && video.readyState >= 2) {
            captureFrame()
          }
        }, 500)
      }

      video.onerror = (e) => {
        if (!resolved) {
          resolved = true
          cleanup()
          reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`))
        }
      }

      // Create object URL and set as video source
      objectUrl = URL.createObjectURL(videoFile)
      video.src = objectUrl

      // Timeout after 30 seconds (longer for mobile devices)
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          reject(new Error('Frame extraction timeout - video may be too large or unsupported format'))
        }
      }, 30000)
    })
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setVideoFile(file)
      setExtractedImageFile(null)

      // Automatically extract frame from video
      setExtractingFrame(true)
      try {
        const extractedImage = await extractFrameFromVideo(file)
        if (extractedImage) {
          setExtractedImageFile(extractedImage)
        } else {
          // If extraction returns null (e.g., file too large), don't show error
          console.log('Frame extraction skipped (file too large or unsupported)')
        }
      } catch (error: any) {
        console.error('Error extracting frame:', error)

        // For mobile devices, provide a helpful message and don't block the user
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        if (isMobile) {
          console.log('Mobile device detected, extraction failed but allowing manual image upload')
          // Don't set error for mobile - just log and allow manual upload
        } else {
          setError(`Error al extraer imagen del video: ${error.message || 'Intenta subir una imagen manualmente'}`)
        }
      } finally {
        setExtractingFrame(false)
      }
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
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
      category: '',
      difficulty_level: '',
      muscle_groups: '',
      equipment_needed: '',
    })
    setVideoFile(null)
    setImageFile(null)
    setExtractedImageFile(null)
    setError(null)
  }

  const compressVideo = async (file: File): Promise<File> => {
    // Only compress if larger than 7MB
    if (file.size < 7 * 1024 * 1024) {
      return file
    }

    setCompressing(true)
    setCompressionProgress(0)
    
    const ffmpeg = new FFmpeg()
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpeg.on('progress', ({ progress }) => {
        setCompressionProgress(Math.round(progress * 100))
      })

      await ffmpeg.writeFile('input.mp4', await fetchFile(file))

      // Compress: CRF 28, 720p, ultrafast preset for speed
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'scale=-2:720', 
        '-c:v', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      ])

      const data = await ffmpeg.readFile('output.mp4') as Uint8Array
      // Fix for Vercel/TypeScript error regarding SharedArrayBuffer vs ArrayBuffer
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer

      const compressedBlob = new Blob([arrayBuffer], { type: 'video/mp4' })
      // Use original name but ensure mp4 extension
      const newName = file.name.replace(/\.[^/.]+$/, '') + '.mp4'
      return new File([compressedBlob], newName, { type: 'video/mp4' })
    } catch (error) {
      console.error('Compression failed:', error)
      return file // Return original if compression fails
    } finally {
      setCompressing(false)
      setCompressionProgress(0)
      ffmpeg.terminate() 
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let videoUrl = null
      let imageUrl = null

      // Upload video if provided
      if (videoFile) {
        // Compress if needed
        const fileToUpload = await compressVideo(videoFile)

        const fileName = `${Date.now()}-${fileToUpload.name}`
        videoUrl = await uploadFile(fileToUpload, 'exercise-videos', fileName)
        if (!videoUrl) {
          throw new Error('Error al subir el video')
        }
      }

      // Upload image: use manually uploaded image if provided, otherwise use extracted frame
      const imageToUpload = imageFile || extractedImageFile
      if (imageToUpload) {
        const fileName = `${Date.now()}-${imageToUpload.name}`
        imageUrl = await uploadFile(imageToUpload, 'exercise-images', fileName)
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

      // Create exercise record
      const { data: insertedExercise, error: insertError } = await supabase
        .from('exercises')
        .insert({
          name: formData.name,
          description: formData.description || null,
          video_url: videoUrl,
          image_url: imageUrl,
          category: formData.category || null,
          muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
          equipment_needed: equipmentNeeded.length > 0 ? equipmentNeeded : null,
          difficulty_level: formData.difficulty_level || null,
          created_by: adminUser?.id,
        })
        .select('exercise_id, name, category, difficulty_level, image_url')
        .single()

      if (insertError) throw insertError

      // Small delay to ensure DB transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Optimistically add exercise to cache immediately
      if (insertedExercise) {
        queryClient.setQueryData<ExerciseMinimal[]>(['exercises'], (old = []) => {
          // Check if already exists (shouldn't, but safety check)
          if (old.some(ex => ex.exercise_id === insertedExercise.exercise_id)) {
            return old
          }
          // Add new exercise at the beginning (most recent first)
          return [insertedExercise, ...old]
        })
      }

      // Revalidate server-side cache - MUST complete before closing modal
      const { revalidateExercises } = await import('@/app/actions/revalidate')
      await revalidateExercises()
      
      // Force immediate refetch to ensure sync
      await queryClient.refetchQueries({ queryKey: ['exercises'] })

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
      <DialogContent className="sm:max-w-[600px] h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl sm:text-2xl">Crear Ejercicio</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm sm:text-base">
            Completa los detalles del nuevo ejercicio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Ej: Press de Banca"
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
              className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              placeholder="Describe el ejercicio..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">
                Categoría
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              placeholder="mancuernas, banco"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video" className="text-white">
              Video
            </Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="bg-zinc-800 border-zinc-700 text-white h-12 sm:h-10 file:mr-3 file:py-2 sm:file:py-1.5 file:px-4 sm:file:px-3 file:rounded-md file:border-0 file:text-sm sm:file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200 active:file:bg-zinc-300 file:h-full touch-manipulation"
            />
            {videoFile && (
              <p className="text-xs text-zinc-400">{videoFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image" className="text-white">
              Imagen (opcional - se extraerá automáticamente del video)
            </Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="bg-zinc-800 border-zinc-700 text-white h-12 sm:h-10 file:mr-3 file:py-2 sm:file:py-1.5 file:px-4 sm:file:px-3 file:rounded-md file:border-0 file:text-sm sm:file:text-xs file:font-medium file:bg-white file:text-black hover:file:bg-zinc-200 active:file:bg-zinc-300 file:h-full touch-manipulation"
            />
            {extractingFrame && (
              <p className="text-xs text-blue-400">Extrayendo imagen del video...</p>
            )}
            {extractedImageFile && !imageFile && (
              <p className="text-xs text-green-400">
                ✓ Imagen extraída automáticamente: {extractedImageFile.name}
              </p>
            )}
            {imageFile && (
              <p className="text-xs text-zinc-400">
                Imagen personalizada: {imageFile.name} (reemplazará la extraída)
              </p>
            )}
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
              className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 min-h-[44px] touch-manipulation text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black hover:bg-zinc-200 min-h-[44px] touch-manipulation text-base"
            >
              {compressing ? `Comprimiendo ${compressionProgress}%...` : loading ? 'Guardando...' : 'Crear Ejercicio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
