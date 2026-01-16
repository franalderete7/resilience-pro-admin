'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
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
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { EXERCISE_CATEGORIES, DIFFICULTY_LEVELS } from '@/lib/constants/exercise-categories'

interface CreateExerciseAIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateExerciseAIModal({ open, onOpenChange, onSuccess }: CreateExerciseAIModalProps) {
  const { adminUser } = useAuth()
  const queryClient = useQueryClient()
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
  const [extractedImageFile, setExtractedImageFile] = useState<File | null>(null)
  const [extractingFrame, setExtractingFrame] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)

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
      logger.warn('Video file too large for mobile extraction:', { size: videoFile.size })
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
      video.preload = 'auto' // Load the entire video for better frame access
      // Don't set crossOrigin for local files - it can cause CORS issues

      // Make video visible but tiny - some browsers need it visible to render frames
      video.style.position = 'fixed'
      video.style.top = '0'
      video.style.left = '0'
      video.style.width = '10px'
      video.style.height = '10px'
      video.style.opacity = '0.01' // Almost invisible but technically visible
      video.style.pointerEvents = 'none'
      video.style.zIndex = '-9999'

      // Add video to DOM temporarily so it can render frames
      document.body.appendChild(video)

      logger.debug('Starting video frame extraction', { fileName: videoFile.name, size: videoFile.size })

      let objectUrl: string | null = null
      let resolved = false
      let captureAttempts = 0
      const maxCaptureAttempts = 5

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

      const captureFrame = (retryOnBlack = true) => {
        captureAttempts++
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

          // Check if canvas is actually drawn (not black) - sample multiple areas across the image
          const samplePoints = [
            { x: canvas.width * 0.25, y: canvas.height * 0.25 },
            { x: canvas.width * 0.5, y: canvas.height * 0.5 },
            { x: canvas.width * 0.75, y: canvas.height * 0.75 },
            { x: canvas.width * 0.25, y: canvas.height * 0.75 },
            { x: canvas.width * 0.75, y: canvas.height * 0.25 },
          ]
          
          let totalBrightness = 0
          let pixelCount = 0
          
          for (const point of samplePoints) {
            const sampleSize = 50
            const x = Math.max(0, Math.floor(point.x) - sampleSize / 2)
            const y = Math.max(0, Math.floor(point.y) - sampleSize / 2)
            const w = Math.min(sampleSize, canvas.width - x)
            const h = Math.min(sampleSize, canvas.height - y)
            
            const imageData = ctx.getImageData(x, y, w, h)
            const pixels = imageData.data
            
            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i]
              const g = pixels[i + 1]
              const b = pixels[i + 2]
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
              totalBrightness += brightness
              pixelCount++
            }
          }

          const averageBrightness = totalBrightness / pixelCount

          // Log brightness for debugging
          logger.debug('Frame captured', { 
            brightness: averageBrightness, 
            width: video.videoWidth, 
            height: video.videoHeight,
            attempt: captureAttempts,
            currentTime: video.currentTime
          })

          // If frame is black and we haven't exhausted retries, try a different time
          if (averageBrightness < 5 && retryOnBlack && captureAttempts < maxCaptureAttempts) {
            logger.warn('Frame appears black, trying different timestamp', { 
              brightness: averageBrightness, 
              attempt: captureAttempts 
            })
            // Try different timestamps
            const newTime = Math.min(video.duration * 0.1 * (captureAttempts + 1), video.duration - 0.1)
            video.currentTime = newTime
            return // Will trigger onseeked again
          }

          // Convert canvas to blob, then to File
          canvas.toBlob(
            (blob) => {
              if (blob && !resolved) {
                resolved = true
                const fileName = videoFile.name.replace(/\.[^/.]+$/, '.jpg')
                const file = new File([blob], fileName, { type: 'image/jpeg' })
                cleanup()
                
                if (averageBrightness < 5) {
                  logger.warn('Final frame is still dark - user may need to upload custom image')
                }
                
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
        logger.debug('Video metadata loaded', { duration: video.duration, width: video.videoWidth, height: video.videoHeight })

        // For very short videos, seek to 10% of duration, otherwise 1 second or 25%
        const seekTime = video.duration < 2
          ? Math.max(0.1, video.duration * 0.1)
          : Math.min(1, Math.max(0.1, video.duration * 0.25))

        logger.debug('Seeking to time', { seekTime })
        video.currentTime = seekTime
      }

      video.onseeked = async () => {
        logger.debug('Video seeked', { readyState: video.readyState, currentTime: video.currentTime })

        // Wait for video to be fully ready with a more robust approach
        const waitForReady = (attempts = 0) => {
          if (attempts > 20) {
            // Give up waiting, try capture anyway
            logger.warn('Max wait attempts reached, attempting capture')
            captureFrame(true)
            return
          }
          
          if (video.readyState >= 3 && video.videoWidth > 0 && video.videoHeight > 0) {
            // readyState 3 = HAVE_FUTURE_DATA, better than 2
            // Try to play video briefly to ensure frame is fully decoded
            video.play().then(() => {
              // Wait for frame to actually render
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  video.pause()
                  // Additional delay to ensure frame is fully rendered before capture
                  setTimeout(() => {
                    captureFrame(true)
                  }, 100)
                })
              })
            }).catch((playError) => {
              logger.warn('Video play failed, attempting direct capture', { error: playError })
              // If play fails, try capturing directly after a longer delay
              setTimeout(() => {
                captureFrame(true)
              }, 500)
            })
          } else {
            logger.debug('Video not ready, waiting...', { readyState: video.readyState, attempts })
            setTimeout(() => waitForReady(attempts + 1), 100)
          }
        }
        waitForReady()
      }

      video.oncanplaythrough = () => {
        logger.debug('Video can play through', { readyState: video.readyState })
      }

      video.onerror = (e) => {
        if (!resolved) {
          resolved = true
          cleanup()
          const errorMsg = video.error?.message || 'Unknown error'
          reject(new Error(`Error al cargar el video: ${errorMsg}`))
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
          reject(new Error('Tiempo de espera agotado al extraer imagen. El video puede ser muy grande o tener un formato no soportado.'))
        }
      }, 30000)
    })
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setVideoFile(file)
      setAnalyzed(false)
      setExtractedImageFile(null)

      // Automatically extract frame from video
      setExtractingFrame(true)
      try {
        const extractedImage = await extractFrameFromVideo(file)
        if (extractedImage) {
          setExtractedImageFile(extractedImage)
        } else {
          // If extraction returns null (e.g., file too large), don't show error
          logger.info('Frame extraction skipped (file too large or unsupported)')
        }
      } catch (error: any) {
        logger.error('Error extracting frame', error)

        // For mobile devices, provide a helpful message and don't block the user
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        if (isMobile) {
          logger.info('Mobile device detected, extraction failed but allowing manual image upload')
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
      logger.debug('Starting AI analysis', { fileName: videoFile.name })
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('/api/analyze-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: videoFile.name.replace(/\.[^/.]+$/, ''), // Send filename without extension
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 429) {
          throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.')
        } else if (response.status === 500) {
          throw new Error('Error del servidor al analizar. Intenta de nuevo más tarde.')
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Sesión expirada. Por favor recarga la página e inicia sesión de nuevo.')
        } else {
          throw new Error(errorData.error || `Error al analizar el ejercicio (${response.status})`)
        }
      }

      const result = await response.json()
      const data = result.data
      
      if (!data) {
        throw new Error('La IA no pudo analizar el ejercicio. Intenta con un nombre de archivo más descriptivo.')
      }
      
      logger.debug('AI analysis completed', { data })

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
      logger.error('Error in analyzeWithAI', err)
      if (err.name === 'AbortError') {
        setError('El análisis tardó demasiado. Por favor intenta de nuevo.')
      } else {
        setError(err.message || 'Error al analizar con IA. Verifica tu conexión e intenta de nuevo.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const uploadFile = async (
    file: File,
    bucket: string,
    fileName: string
  ): Promise<string> => {
    const maxVideoSize = 50 * 1024 * 1024 // 50MB limit for videos
    const maxImageSize = 10 * 1024 * 1024 // 10MB limit for images
    const maxSize = bucket.includes('video') ? maxVideoSize : maxImageSize
    const sizeLabel = bucket.includes('video') ? '50MB' : '10MB'
    
    if (file.size > maxSize) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). El límite es ${sizeLabel}.`)
    }
    
    logger.debug('Uploading file', { bucket, fileName, size: file.size })
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      logger.error('Upload error:', error)
      // Provide specific error messages
      if (error.message?.includes('Payload too large') || error.message?.includes('413')) {
        throw new Error(`El archivo es demasiado grande para subir. Intenta con un archivo más pequeño (máximo ${sizeLabel}).`)
      } else if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        throw new Error('Ya existe un archivo con este nombre. Intenta de nuevo.')
      } else if (error.message?.includes('permission') || error.message?.includes('not authorized')) {
        throw new Error('No tienes permisos para subir archivos. Verifica tu sesión.')
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo.')
      } else {
        throw new Error(`Error al subir archivo: ${error.message || 'Error desconocido'}`)
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return publicUrl
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
    setExtractedImageFile(null)
    setError(null)
    setAnalyzed(false)
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
      logger.debug('Starting video compression', { originalSize: file.size })
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
      const compressedFile = new File([compressedBlob], newName, { type: 'video/mp4' })
      
      logger.info('Video compression complete', { 
        originalSize: file.size, 
        compressedSize: compressedFile.size,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      })
      
      return compressedFile
    } catch (error) {
      logger.error('Compression failed, using original file', error)
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
      logger.info('Submitting exercise creation form')
      
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('El nombre del ejercicio es requerido.')
      }
      
      if (!videoFile) {
        throw new Error('Por favor sube un video del ejercicio.')
      }
      
      let videoUrl: string | null = null
      let imageUrl: string | null = null

      // Upload video
      try {
        // Compress if needed
        const fileToUpload = await compressVideo(videoFile)
        const fileName = `${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        videoUrl = await uploadFile(fileToUpload, 'exercise-videos', fileName)
      } catch (uploadErr: any) {
        logger.error('Video upload failed', uploadErr)
        throw new Error(`Error al subir video: ${uploadErr.message}`)
      }

      // Upload image: use manually uploaded image if provided, otherwise use extracted frame
      const imageToUpload = imageFile || extractedImageFile
      if (imageToUpload) {
        try {
          const fileName = `${Date.now()}-${imageToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          imageUrl = await uploadFile(imageToUpload, 'exercise-images', fileName)
        } catch (uploadErr: any) {
          logger.error('Image upload failed', uploadErr)
          // Don't fail the whole process for image upload - video is more important
          logger.warn('Continuing without image')
          setError(`Nota: La imagen no se pudo subir (${uploadErr.message}), pero el ejercicio se creará sin imagen.`)
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
      logger.debug('Creating exercise record in DB')
      const { error: insertError } = await supabase.from('exercises').insert({
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        video_url: videoUrl,
        image_url: imageUrl,
        category: primaryCategory,
        muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
        equipment_needed: equipmentNeeded.length > 0 ? equipmentNeeded : null,
        difficulty_level: formData.difficulty_level || null,
        created_by: adminUser?.id,
      })

      if (insertError) {
        logger.error('Database insert error', insertError)
        if (insertError.message?.includes('duplicate')) {
          throw new Error('Ya existe un ejercicio con este nombre.')
        } else if (insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
          throw new Error('No tienes permisos para crear ejercicios. Verifica tu sesión.')
        } else {
          throw new Error(`Error al guardar en base de datos: ${insertError.message}`)
        }
      }

      logger.info('Exercise created successfully')
      
      // Revalidate server-side cache
      const { revalidateExercises } = await import('@/app/actions/revalidate')
      await revalidateExercises()
      
      // Invalidate client-side cache to force refetch
      await queryClient.invalidateQueries({ queryKey: ['exercises'] })
      
      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      logger.error('Error creating exercise', err)
      setError(err.message || 'Error desconocido al crear el ejercicio. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
            Crear Ejercicio con IA
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm sm:text-base">
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

            <Button
              type="button"
              onClick={analyzeWithAI}
              disabled={!videoFile || analyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white min-h-[44px] touch-manipulation text-base"
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
                className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50 min-h-[88px] touch-manipulation"
                placeholder="Analiza primero con IA"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Categorías</Label>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.value)}
                    disabled={!analyzed}
                    className={`px-4 py-2 sm:px-3 sm:py-1 rounded-full text-sm transition-colors cursor-pointer disabled:cursor-not-allowed min-h-[44px] sm:min-h-0 touch-manipulation ${
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
                  {DIFFICULTY_LEVELS.map((level) => (
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
              className="flex-1 border-zinc-700 text-white hover:bg-zinc-800 min-h-[44px] touch-manipulation text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !analyzed}
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
