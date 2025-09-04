import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const fileShareId = formData.get('fileShareId') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const chunk = formData.get('chunk') as File
    const checksum = formData.get('checksum') as string

    if (!fileShareId || isNaN(chunkIndex) || !chunk) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if file is expired
    if (new Date() > fileShare.expiresAt) {
      return NextResponse.json(
        { error: 'File share has expired' },
        { status: 410 }
      )
    }

    // Find the specific chunk
    const chunkRecord = fileShare.chunks.find(c => c.chunkIndex === chunkIndex)
    if (!chunkRecord) {
      return NextResponse.json(
        { error: 'Chunk not found' },
        { status: 404 }
      )
    }

    // Check if chunk is already uploaded
    if (chunkRecord.isUploaded) {
      return NextResponse.json({
        success: true,
        message: 'Chunk already uploaded',
        uploadedChunks: fileShare.uploadedChunks
      })
    }

    // In a real implementation, you would:
    // 1. Save the chunk to cloud storage (S3, Backblaze, etc.)
    // 2. Verify the checksum if provided
    // 3. Store the chunk location in the database
    
    // For this demo, we'll just mark it as uploaded
    await db.fileChunk.update({
      where: { id: chunkRecord.id },
      data: { 
        isUploaded: true,
        checksum: checksum || null
      }
    })

    // Update uploaded chunks count
    const updatedFileShare = await db.fileShare.update({
      where: { id: fileShareId },
      data: { 
        uploadedChunks: {
          increment: 1
        }
      },
      include: { chunks: true }
    })

    return NextResponse.json({
      success: true,
      uploadedChunks: updatedFileShare.uploadedChunks,
      totalChunks: updatedFileShare.totalChunks,
      isComplete: updatedFileShare.uploadedChunks === updatedFileShare.totalChunks
    })

  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
}