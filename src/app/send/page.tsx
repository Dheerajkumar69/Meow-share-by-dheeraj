'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  File, 
  X, 
  Copy, 
  Check, 
  Clock, 
  Download,
  Link as LinkIcon,
  AlertCircle,
  Smartphone
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { QRCodeGenerator } from '@/components/qrcode'

interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  shareCode?: string
  shareUrl?: string
  error?: string
}

export default function SendPage() {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const generateShareCode = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-'
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }, [])

  const handleFileSelect = useCallback((files: FileList | null, directoryMode = false) => {
    if (!files) return

    Array.from(files).forEach(file => {
      // Skip directory entries in directory mode
      if (directoryMode && file.size === 0 && file.name === '.') return
      if (directoryMode && file.size === 0 && file.name === '..') return

      const upload: FileUpload = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: 'pending'
      }
      setUploads(prev => [...prev, upload])
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const items = Array.from(e.dataTransfer.items)
    const files: File[] = []
    
    // Handle both files and directories
    items.forEach(item => {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry()
        if (entry) {
          if (entry.isFile) {
            const file = item.getAsFile()
            if (file) files.push(file)
          } else if (entry.isDirectory) {
            // For directories, we would need to recursively read files
            // For now, we'll just show a message that directory upload is supported
            console.log('Directory upload detected:', entry.fullPath)
          }
        }
      }
    })
    
    // Also check for regular files in dataTransfer
    const dtFiles = e.dataTransfer.files
    if (dtFiles.length > 0) {
      files.push(...Array.from(dtFiles))
    }
    
    if (files.length > 0) {
      handleFileSelect(files as unknown as FileList)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id))
  }, [])

  const startUpload = useCallback(async (upload: FileUpload) => {
    setUploads(prev => prev.map(u => 
      u.id === upload.id ? { ...u, status: 'uploading' } : u
    ))

    try {
      // Initialize upload
      const initResponse = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: upload.file.name,
          fileSize: upload.file.size,
          mimeType: upload.file.type,
          chunkSize: 5242880 // 5MB chunks
        })
      })

      if (!initResponse.ok) {
        const errorData = await initResponse.json()
        throw new Error(errorData.error || 'Failed to initialize upload')
      }

      const { fileShareId, shareCode, totalChunks, chunkSize } = await initResponse.json()

      // Upload chunks
      const chunks: Blob[] = []
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, upload.file.size)
        const chunk = upload.file.slice(start, end)
        chunks.push(chunk)
      }

      let uploadedChunks = 0
      const uploadPromises = chunks.map(async (chunk, index) => {
        const formData = new FormData()
        formData.append('fileShareId', fileShareId)
        formData.append('chunkIndex', index.toString())
        formData.append('chunk', chunk)

        const response = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Failed to upload chunk ${index}`)
        }

        const result = await response.json()
        if (result.success) {
          uploadedChunks++
          const progress = (uploadedChunks / totalChunks) * 100
          setUploads(prev => prev.map(u => 
            u.id === upload.id ? { ...u, progress } : u
          ))
        }

        return result
      })

      await Promise.all(uploadPromises)

      // Complete upload
      const completeResponse = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileShareId })
      })

      if (!completeResponse.ok) {
        throw new Error('Failed to complete upload')
      }

      const { shareUrl } = await completeResponse.json()

      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { 
          ...u, 
          progress: 100, 
          status: 'completed',
          shareCode,
          shareUrl
        } : u
      ))

      toast({
        title: "Upload Complete!",
        description: "Your file has been uploaded successfully.",
      })
    } catch (error) {
      console.error('Upload error:', error)
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { 
          ...u, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
        } : u
      ))

      toast({
        title: "Upload Failed",
        description: "There was an error uploading your file.",
        variant: "destructive",
      })
    }
  }, [toast])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Share code copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      })
    }
  }, [toast])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const pendingUploads = uploads.filter(u => u.status === 'pending')
  const uploadingUploads = uploads.filter(u => u.status === 'uploading')
  const completedUploads = uploads.filter(u => u.status === 'completed')
  const errorUploads = uploads.filter(u => u.status === 'error')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Send a File</h1>
            <p className="text-muted-foreground">Share files securely with anyone, anywhere</p>
          </div>

          {/* Upload Area */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Select Files
              </CardTitle>
              <CardDescription>
                Drag and drop files here or click to browse. Files will be automatically deleted after 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Support for all file types, unlimited size
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Multiple files</Badge>
                  <Badge variant="outline">Folders</Badge>
                  <Badge variant="outline">Any size</Badge>
                  <Badge variant="outline">Auto-resume</Badge>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  webkitdirectory=""
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pending Uploads */}
          {pendingUploads.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Ready to Upload ({pendingUploads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingUploads.map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{upload.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => startUpload(upload)}
                        size="sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                      <Button
                        onClick={() => removeUpload(upload.id)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Uploading */}
          {uploadingUploads.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 animate-pulse" />
                  Uploading ({uploadingUploads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadingUploads.map(upload => (
                  <div key={upload.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <File className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{upload.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file.size)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Uploading...</Badge>
                    </div>
                    <Progress value={upload.progress} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-1">
                      {upload.progress.toFixed(0)}% complete
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed Uploads */}
          {completedUploads.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Upload Complete ({completedUploads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {completedUploads.map(upload => (
                  <div key={upload.id} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <File className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="font-medium">{upload.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file.size)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500">
                        Complete
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Share Code:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                            {upload.shareCode}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(upload.shareCode!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Share Link:</span>
                        <div className="flex items-center gap-2 flex-1 ml-4">
                          <Input
                            value={upload.shareUrl}
                            readOnly
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(upload.shareUrl!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* QR Code Section */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <Smartphone className="w-4 h-4" />
                          <span className="text-sm font-medium">Mobile Sharing:</span>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <QRCodeGenerator value={upload.shareUrl!} size={150} />
                          <div className="text-xs text-muted-foreground max-w-32">
                            Scan this QR code with your mobile device to quickly access the download page
                          </div>
                        </div>
                      </div>
                      
                      <Alert>
                        <Clock className="w-4 h-4" />
                        <AlertDescription>
                          This file will be automatically deleted in 24 hours or after one download.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {errorUploads.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Upload Errors ({errorUploads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorUploads.map(upload => (
                  <div key={upload.id} className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <File className="w-8 h-8 text-red-500" />
                        <div>
                          <p className="font-medium">{upload.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file.size)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                      {upload.error}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => startUpload(upload)}
                        size="sm"
                        variant="outline"
                      >
                        Retry
                      </Button>
                      <Button
                        onClick={() => removeUpload(upload.id)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}