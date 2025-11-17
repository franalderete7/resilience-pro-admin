import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// NOTE:
// This helper is designed for environments where @ffmpeg/ffmpeg runs (e.g. Node/Edge or browser with WASM).
// It intentionally avoids using Node's Buffer type in the public API to keep it platform-agnostic.

let ffmpegInstance: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  const ffmpeg = new FFmpeg()
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegInstance = ffmpeg
    return ffmpeg
  } catch (error) {
    throw new Error(`Failed to load FFmpeg: ${error}`)
  }
}

/**
 * Extracts a frame from a video file at the specified time (default: 1 second)
 * @param videoFile - The video file (File)
 * @param timeInSeconds - Time in seconds to extract frame (default: 1)
 * @returns Uint8Array of the extracted frame image (JPEG)
 */
export async function extractFrameFromVideo(
  videoFile: File,
  timeInSeconds: number = 1
): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg()

  try {
    // Write video file to FFmpeg's virtual filesystem
    const videoData = await fetchFile(videoFile)

    await ffmpeg.writeFile('input.mp4', videoData as Uint8Array)

    // Extract frame at specified time
    // -ss: seek to time
    // -vframes 1: extract 1 frame
    // -q:v 2: high quality JPEG
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', timeInSeconds.toString(),
      '-vframes', '1',
      '-q:v', '2',
      'output.jpg'
    ])

    // Read the extracted frame
    const frameData = await ffmpeg.readFile('output.jpg')

    // Clean up
    await ffmpeg.deleteFile('input.mp4')
    await ffmpeg.deleteFile('output.jpg')

    // ffmpeg.readFile returns a Uint8Array in web/wasm environments
    return frameData as Uint8Array
  } catch (error) {
    // Clean up on error
    try {
      await ffmpeg.deleteFile('input.mp4')
      await ffmpeg.deleteFile('output.jpg')
    } catch {}
    
    throw new Error(`Failed to extract frame: ${error}`)
  }
}

/**
 * Extracts a frame and returns it as a File object
 */
export async function extractFrameAsFile(
  videoFile: File,
  timeInSeconds: number = 1,
  outputFileName?: string
): Promise<File> {
  const frameData = await extractFrameFromVideo(videoFile, timeInSeconds)

  // Convert Uint8Array to proper ArrayBuffer for Blob constructor
  const arrayBuffer = frameData.buffer.slice(
    frameData.byteOffset,
    frameData.byteOffset + frameData.byteLength
  ) as ArrayBuffer

  const fileName = outputFileName || videoFile.name.replace(/\.[^/.]+$/, '.jpg')
  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })

  return new File([blob], fileName, { type: 'image/jpeg' })
}

