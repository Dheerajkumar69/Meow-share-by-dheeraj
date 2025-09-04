import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fileShareId } = await request.json()

    if (!fileShareId) {
      return NextResponse.json(
        { error: 'Missing fileShareId' },
        { status: 400 }
      )
    }

    // Get file share record
    const fileShare = await db.fileShare.findUnique({
      where: { id: fileShareId },
      include: { chunks: true }
    })

    if (!fileShare) {
      return NextResponse.json(
        { error: 'File share not found' },
        { status: 404 }
      )
    }

    // Check if all chunks are uploaded
    const allChunksUploaded = fileShare.chunks.every(chunk => chunk.isUploaded)
    
    if (!allChunksUploaded) {
      return NextResponse.json(
        { 
          error: 'Not all chunks uploaded',
          uploadedChunks: fileShare.uploadedChunks,
          totalChunks: fileShare.totalChunks
        },
        { status: 400 }
      )
    }

    // In a real implementation, you would:
    // 1. Combine all chunks from cloud storage
    // 2. Verify the complete file integrity
    // 3. Store the final file location
    
    // For this demo, we'll just mark it as ready
    const updatedFileShare = await db.fileShare.update({
      where: { id: fileShareId },
      data: {
        // Additional completion logic can be added here
      },
      include: { chunks: true }
    })

    return NextResponse.json({
      success: true,
      shareCode: updatedFileShare.code,
      shareUrl: `${request.nextUrl.origin}/receive/${updatedFileShare.code}`,
      expiresAt: updatedFileShare.expiresAt,
      fileName: updatedFileShare.fileName,
      fileSize: updatedFileShare.fileSize
    })

  } catch (error) {
    console.error('Upload complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    )
  }
}