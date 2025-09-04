import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileSize, mimeType, chunkSize = 5242880 } = await request.json()

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique share code
    const generateShareCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-'
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let shareCode: string
    let existingFile = null
    
    // Ensure unique code
    do {
      shareCode = generateShareCode()
      existingFile = await db.fileShare.findUnique({
        where: { code: shareCode }
      })
    } while (existingFile)

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / chunkSize)

    // Create file share record
    const fileShare = await db.fileShare.create({
      data: {
        code: shareCode,
        fileName,
        fileSize,
        mimeType,
        chunkSize,
        totalChunks,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        chunks: {
          create: Array.from({ length: totalChunks }, (_, index) => ({
            chunkIndex: index,
            chunkSize: Math.min(chunkSize, fileSize - index * chunkSize),
            isUploaded: false
          }))
        }
      },
      include: {
        chunks: true
      }
    })

    return NextResponse.json({
      success: true,
      fileShareId: fileShare.id,
      shareCode: fileShare.code,
      totalChunks: fileShare.totalChunks,
      chunkSize: fileShare.chunkSize
    })

  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize upload' },
      { status: 500 }
    )
  }
}