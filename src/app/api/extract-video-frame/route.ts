import { NextRequest, NextResponse } from 'next/server'
import { extractFrameFromVideo } from '@/lib/video-frame-extractor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      )
    }

    // Get time parameter (optional, default 1 second)
    const timeParam = formData.get('time')
    const timeInSeconds = timeParam ? parseFloat(timeParam as string) : 1

    // Extract frame from video (returns Uint8Array)
    const frameData = await extractFrameFromVideo(videoFile, timeInSeconds)

    // Convert to a real ArrayBuffer (not SharedArrayBuffer / ArrayBufferLike)
    const arrayBuffer = frameData.buffer.slice(
      frameData.byteOffset,
      frameData.byteOffset + frameData.byteLength
    ) as ArrayBuffer

    // Wrap in Blob so it's a clear BodyInit type
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })

    // Return the frame as a blob response
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${videoFile.name.replace(/\.[^/.]+$/, '.jpg')}"`,
      },
    })
  } catch (error: any) {
    console.error('Error extracting frame:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract frame from video' },
      { status: 500 }
    )
  }
}

