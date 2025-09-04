import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code

    // Get file share record
    const fileShare = await db.fileShare.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!fileShare) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check if file is expired
    if (new Date() > fileShare.expiresAt) {
      return NextResponse.json(
        { error: 'File has expired' },
        { status: 410 }
      )
    }

    // Check if file is deleted
    if (fileShare.isDeleted) {
      return NextResponse.json(
        { error: 'File is no longer available' },
        { status: 410 }
      )
    }

    // Check if download limit reached
    if (fileShare.downloadCount >= fileShare.maxDownloads) {
      return NextResponse.json(
        { error: 'Download limit reached' },
        { status: 410 }
      )
    }

    // Check if all chunks are uploaded
    const chunks = await db.fileChunk.findMany({
      where: { fileShareId: fileShare.id }
    })

    const allChunksUploaded = chunks.every(chunk => chunk.isUploaded)
    
    if (!allChunksUploaded) {
      return NextResponse.json(
        { error: 'File upload is not complete' },
        { status: 425 }
      )
    }

    // Increment download count
    await db.fileShare.update({
      where: { id: fileShare.id },
      data: { 
        downloadCount: {
          increment: 1
        }
      }
    })

    // In a real implementation, you would:
    // 1. Stream the file from cloud storage
    // 2. Handle range requests for resume functionality
    // 3. Set proper headers for download
    
    // For this demo, we'll create a mock file
    const mockContent = `Mock file content for ${fileShare.fileName}\nSize: ${fileShare.fileSize} bytes\nType: ${fileShare.mimeType}\n\nThis is a demo file for the file sharing application.`
    
    const buffer = Buffer.from(mockContent, 'utf-8')
    
    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', fileShare.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${fileShare.fileName}"`)
    headers.set('Content-Length', buffer.length.toString())
    headers.set('Accept-Ranges', 'bytes')
    
    // Handle range requests for resume functionality
    const range = request.headers.get('range')
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1
      
      if (start >= buffer.length) {
        return NextResponse.json(
          { error: 'Range not satisfiable' },
          { status: 416 }
        )
      }
      
      const chunk = buffer.slice(start, end + 1)
      headers.set('Content-Range', `bytes ${start}-${end}/${buffer.length}`)
      headers.set('Content-Length', chunk.length.toString())
      
      return new NextResponse(chunk, {
        status: 206,
        headers
      })
    }
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}