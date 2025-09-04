import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Missing share code' },
        { status: 400 }
      )
    }

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

    // In a real implementation, you would:
    // 1. Generate a secure download URL for cloud storage
    // 2. Or stream the file chunks directly from cloud storage
    // 3. Handle range requests for resume functionality
    
    // For this demo, we'll return the file metadata
    // The actual download would be handled by a separate GET endpoint
    
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/file/download/${code}`,
      fileName: fileShare.fileName,
      fileSize: fileShare.fileSize,
      mimeType: fileShare.mimeType,
      remainingDownloads: Math.max(0, fileShare.maxDownloads - fileShare.downloadCount - 1)
    })

  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare download' },
      { status: 500 }
    )
  }
}