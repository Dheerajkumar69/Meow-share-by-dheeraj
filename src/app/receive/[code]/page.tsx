'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  File, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle,
  Search,
  ArrowLeft
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface FileInfo {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  expiresAt: string
  downloadCount: number
  maxDownloads: number
}

export default function ReceiveCodePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [code] = useState(params.code as string || '')
  const [isLoading, setIsLoading] = useState(true)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const formatExpiry = useCallback((expiresAt: string) => {
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const diff = expiryDate.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? 's' : ''} remaining`
    }
    
    return `${hours}h ${minutes}m remaining`
  }, [])

  useEffect(() => {
    const fetchFileInfo = async () => {
      if (!code) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/file/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to fetch file information.')
          return
        }

        if (data.success) {
          setFileInfo(data.file)
        }
      } catch (error) {
        setError('Failed to fetch file information. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileInfo()
  }, [code])

  const handleDownload = useCallback(async () => {
    if (!fileInfo) return

    setIsDownloading(true)
    try {
      const response = await fetch('/api/file/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download file')
      }

      if (data.success) {
        // Create download link
        const downloadLink = document.createElement('a')
        downloadLink.href = data.downloadUrl
        downloadLink.download = data.fileName
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        toast({
          title: "Download Complete!",
          description: "File downloaded successfully.",
        })

        // Update file info to reflect download
        setFileInfo(prev => prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : null)

        // If this was the last download, show message
        if (data.remainingDownloads === 0) {
          toast({
            title: "File Consumed",
            description: "This file has been downloaded the maximum number of times and is no longer available.",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "There was an error downloading the file.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }, [fileInfo, code, toast])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Code copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      })
    }
  }, [toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Receive a File</h1>
            <p className="text-muted-foreground">Downloading file with code: {code}</p>
          </div>

          {/* Loading */}
          {isLoading && (
            <Card className="mb-6">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Fetching file information...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Info */}
          {fileInfo && !isLoading && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  File Ready for Download
                </CardTitle>
                <CardDescription>
                  This file is available for download
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{fileInfo.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(fileInfo.fileSize)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {fileInfo.downloadCount}/{fileInfo.maxDownloads} downloads
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-muted-foreground">{fileInfo.mimeType}</p>
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>
                    <p className="text-muted-foreground">{formatExpiry(fileInfo.expiresAt)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading || fileInfo.downloadCount >= fileInfo.maxDownloads}
                    className="flex-1"
                    size="lg"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/receive')}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {fileInfo.downloadCount >= fileInfo.maxDownloads && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      This file has reached its maximum download limit and is no longer available.
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <Clock className="w-4 h-4" />
                  <AlertDescription>
                    This file will be automatically deleted {formatExpiry(fileInfo.expiresAt)}. 
                    {fileInfo.maxDownloads > 1 && (
                      <> It can be downloaded {fileInfo.maxDownloads - fileInfo.downloadCount} more time{fileInfo.maxDownloads - fileInfo.downloadCount > 1 ? 's' : ''}.</>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!fileInfo && !isLoading && !error && (
            <Card>
              <CardHeader>
                <CardTitle>How to Receive Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Get the Share Code</p>
                    <p className="text-sm text-muted-foreground">
                      Ask the sender for the 8-character share code (e.g., ABCD-1234)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Enter the Code</p>
                    <p className="text-sm text-muted-foreground">
                      Type or paste the code in the input field above
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Download Your File</p>
                    <p className="text-sm text-muted-foreground">
                      Click the download button to save the file to your device
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}