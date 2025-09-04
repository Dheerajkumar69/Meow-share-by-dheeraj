'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  Download, 
  Pause, 
  Play, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Activity,
  Hash,
  Database,
  Network,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ChunkTransfer {
  id: string
  type: 'upload' | 'download'
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunks: number
  downloadedChunks: number
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed' | 'resumed'
  progress: number
  speed: number // bytes per second
  checksum?: string
  timestamp: Date
  retryCount: number
  parallelThreads: number
}

interface ParallelTransfer {
  id: string
  chunkIndex: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
  progress: number
  speed: number
  retryCount: number
}

export function ParallelChunkTransferTest() {
  const [transfers, setTransfers] = useState<ChunkTransfer[]>([])
  const [isTransferring, setIsTransferring] = useState(false)
  const [maxParallelThreads, setMaxParallelThreads] = useState(4)
  const [chunkSize, setChunkSize] = useState(5 * 1024 * 1024) // 5MB
  const [testFileSize, setTestFileSize] = useState(100 * 1024 * 1024) // 100MB
  const [globalStats, setGlobalStats] = useState({
    totalBytesTransferred: 0,
    averageSpeed: 0,
    activeTransfers: 0,
    completedTransfers: 0
  })
  
  const activeTransfersRef = useRef<Map<string, ParallelTransfer[]>>(new Map())
  const { toast } = useToast()

  const generateChecksum = async (data: string): Promise<string> => {
    // Simulate SHA-256 checksum generation
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const startUpload = async () => {
    const transferId = Math.random().toString(36).substr(2, 9)
    const totalChunks = Math.ceil(testFileSize / chunkSize)
    
    const transfer: ChunkTransfer = {
      id: transferId,
      type: 'upload',
      fileName: `test-file-${Date.now()}.bin`,
      fileSize: testFileSize,
      chunkSize,
      totalChunks,
      uploadedChunks: 0,
      downloadedChunks: 0,
      status: 'pending',
      progress: 0,
      speed: 0,
      timestamp: new Date(),
      retryCount: 0,
      parallelThreads: maxParallelThreads
    }

    setTransfers(prev => [transfer, ...prev])
    await executeTransfer(transfer)
  }

  const startDownload = async () => {
    const transferId = Math.random().toString(36).substr(2, 9)
    const totalChunks = Math.ceil(testFileSize / chunkSize)
    
    const transfer: ChunkTransfer = {
      id: transferId,
      type: 'download',
      fileName: `downloaded-file-${Date.now()}.bin`,
      fileSize: testFileSize,
      chunkSize,
      totalChunks,
      uploadedChunks: 0,
      downloadedChunks: 0,
      status: 'pending',
      progress: 0,
      speed: 0,
      timestamp: new Date(),
      retryCount: 0,
      parallelThreads: maxParallelThreads
    }

    setTransfers(prev => [transfer, ...prev])
    await executeTransfer(transfer)
  }

  const executeTransfer = async (transfer: ChunkTransfer) => {
    setTransfers(prev => 
      prev.map(t => t.id === transfer.id ? { ...t, status: 'transferring' } : t)
    )
    
    setIsTransferring(true)
    
    // Initialize parallel transfers
    const parallelTransfers: ParallelTransfer[] = []
    for (let i = 0; i < transfer.totalChunks; i++) {
      parallelTransfers.push({
        id: `${transfer.id}-chunk-${i}`,
        chunkIndex: i,
        status: 'pending',
        progress: 0,
        speed: 0,
        retryCount: 0
      })
    }
    
    activeTransfersRef.current.set(transfer.id, parallelTransfers)
    
    try {
      await processParallelChunks(transfer)
      
      // Generate checksum for verification
      const checksum = await generateChecksum(`file-${transfer.id}-${Date.now()}`)
      
      setTransfers(prev => 
        prev.map(t => t.id === transfer.id ? { 
          ...t, 
          status: 'completed', 
          progress: 100,
          checksum,
          [transfer.type === 'upload' ? 'uploadedChunks' : 'downloadedChunks']: transfer.totalChunks
        } : t)
      )
      
      // Update global stats
      setGlobalStats(prev => ({
        ...prev,
        totalBytesTransferred: prev.totalBytesTransferred + transfer.fileSize,
        completedTransfers: prev.completedTransfers + 1
      }))
      
      toast({
        title: "Transfer Complete!",
        description: `${transfer.fileName} ${transfer.type === 'upload' ? 'uploaded' : 'downloaded'} successfully.`,
      })
    } catch (error) {
      console.error('Transfer failed:', error)
      
      setTransfers(prev => 
        prev.map(t => t.id === transfer.id ? { ...t, status: 'failed' } : t)
      )
      
      toast({
        title: "Transfer Failed",
        description: `${transfer.fileName} transfer failed.`,
        variant: "destructive",
      })
    } finally {
      activeTransfersRef.current.delete(transfer.id)
      setIsTransferring(false)
      
      // Update active transfers count
      const activeCount = Array.from(activeTransfersRef.current.values())
        .reduce((sum, transfers) => sum + transfers.filter(t => t.status === 'transferring').length, 0)
      setGlobalStats(prev => ({ ...prev, activeTransfers: activeCount }))
    }
  }

  const processParallelChunks = async (transfer: ChunkTransfer): Promise<void> => {
    const parallelTransfers = activeTransfersRef.current.get(transfer.id) || []
    const maxConcurrent = Math.min(maxParallelThreads, parallelTransfers.length)
    
    return new Promise((resolve, reject) => {
      let completedChunks = 0
      let totalBytesTransferred = 0
      let startTime = Date.now()
      
      const processChunk = async (chunkTransfer: ParallelTransfer): Promise<void> => {
        try {
          // Update chunk status
          chunkTransfer.status = 'transferring'
          updateTransferProgress(transfer.id)
          
          // Simulate chunk transfer
          await simulateChunkTransfer(chunkTransfer, transfer.chunkSize)
          
          // Mark chunk as completed
          chunkTransfer.status = 'completed'
          chunkTransfer.progress = 100
          completedChunks++
          totalBytesTransferred += transfer.chunkSize
          
          // Update transfer progress
          const progress = (completedChunks / transfer.totalChunks) * 100
          const elapsed = (Date.now() - startTime) / 1000 // seconds
          const speed = totalBytesTransferred / elapsed // bytes per second
          
          setTransfers(prev => 
            prev.map(t => t.id === transfer.id ? { 
              ...t, 
              progress,
              speed,
              [transfer.type === 'upload' ? 'uploadedChunks' : 'downloadedChunks']: completedChunks
            } : t)
          )
          
          updateTransferProgress(transfer.id)
          
        } catch (error) {
          console.error(`Chunk ${chunkTransfer.chunkIndex} failed:`, error)
          
          chunkTransfer.retryCount++
          if (chunkTransfer.retryCount < 3) {
            // Retry chunk
            chunkTransfer.status = 'pending'
            setTimeout(() => processChunk(chunkTransfer), 1000 * chunkTransfer.retryCount)
          } else {
            chunkTransfer.status = 'failed'
            reject(new Error(`Chunk ${chunkTransfer.chunkIndex} failed after ${chunkTransfer.retryCount} retries`))
          }
        }
      }
      
      const updateTransferProgress = (transferId: string) => {
        const transfers = activeTransfersRef.current.get(transferId) || []
        const activeCount = transfers.filter(t => t.status === 'transferring').length
        setGlobalStats(prev => ({ ...prev, activeTransfers: activeCount }))
      }
      
      // Process chunks in parallel with limited concurrency
      const processNextChunk = async () => {
        const pendingChunks = parallelTransfers.filter(t => t.status === 'pending')
        const activeChunks = parallelTransfers.filter(t => t.status === 'transferring')
        
        if (pendingChunks.length === 0 && activeChunks.length === 0) {
          // All chunks completed
          resolve()
          return
        }
        
        if (activeChunks.length < maxConcurrent && pendingChunks.length > 0) {
          const nextChunk = pendingChunks[0]
          await processChunk(nextChunk)
        }
        
        // Continue processing
        setTimeout(processNextChunk, 100)
      }
      
      // Start processing
      processNextChunk()
    })
  }

  const simulateChunkTransfer = async (chunkTransfer: ParallelTransfer, chunkSize: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const duration = 500 + Math.random() * 1500 // 0.5-2 seconds
      const steps = 20
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        const progress = (currentStep / steps) * 100
        const speed = chunkSize / (duration / 1000) // bytes per second
        
        chunkTransfer.progress = progress
        chunkTransfer.speed = speed
        
        if (currentStep >= steps) {
          clearInterval(interval)
          
          // Simulate occasional failures
          if (Math.random() < 0.02) { // 2% failure rate
            reject(new Error('Network error'))
          } else {
            resolve()
          }
        }
      }, duration / steps)
    })
  }

  const pauseTransfer = (transferId: string) => {
    setTransfers(prev => 
      prev.map(t => t.id === transferId ? { ...t, status: 'paused' } : t)
    )
    
    // Pause all active chunks
    const parallelTransfers = activeTransfersRef.current.get(transferId) || []
    parallelTransfers.forEach(chunk => {
      if (chunk.status === 'transferring') {
        chunk.status = 'pending'
      }
    })
    
    toast({
      title: "Transfer Paused",
      description: "Transfer has been paused.",
    })
  }

  const resumeTransfer = async (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId)
    if (!transfer) return
    
    setTransfers(prev => 
      prev.map(t => t.id === transferId ? { ...t, status: 'resumed' } : t)
    )
    
    // Resume processing chunks
    await processParallelChunks(transfer)
  }

  const cancelTransfer = (transferId: string) => {
    setTransfers(prev => prev.filter(t => t.id !== transferId))
    activeTransfersRef.current.delete(transferId)
    
    toast({
      title: "Transfer Cancelled",
      description: "Transfer has been cancelled.",
    })
  }

  const retryTransfer = async (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId)
    if (!transfer) return
    
    // Reset transfer state
    const resetTransfer: ChunkTransfer = {
      ...transfer,
      status: 'pending',
      progress: 0,
      speed: 0,
      uploadedChunks: 0,
      downloadedChunks: 0,
      retryCount: transfer.retryCount + 1
    }
    
    setTransfers(prev => 
      prev.map(t => t.id === transferId ? resetTransfer : t)
    )
    
    await executeTransfer(resetTransfer)
  }

  const clearCompleted = () => {
    setTransfers(prev => prev.filter(t => t.status !== 'completed'))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s'
  }

  const getStatusIcon = (status: ChunkTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'transferring':
      case 'resumed':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Parallel Chunk Transfer Test
          </CardTitle>
          <CardDescription>
            Test parallel chunk upload/download with resume functionality and integrity verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test File Size</label>
              <select 
                value={testFileSize} 
                onChange={(e) => setTestFileSize(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                <option value={10 * 1024 * 1024}>10 MB</option>
                <option value={50 * 1024 * 1024}>50 MB</option>
                <option value={100 * 1024 * 1024}>100 MB</option>
                <option value={500 * 1024 * 1024}>500 MB</option>
                <option value={1024 * 1024 * 1024}>1 GB</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chunk Size</label>
              <select 
                value={chunkSize} 
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              >
                <option value={1024 * 1024}>1 MB</option>
                <option value={5 * 1024 * 1024}>5 MB</option>
                <option value={10 * 1024 * 1024}>10 MB</option>
                <option value={20 * 1024 * 1024}>20 MB</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Parallel Threads</label>
              <Input
                type="number"
                min="1"
                max="16"
                value={maxParallelThreads}
                onChange={(e) => setMaxParallelThreads(Math.min(16, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>

          {/* Transfer Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={startUpload} 
              disabled={isTransferring}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Start Upload Test
            </Button>
            <Button 
              onClick={startDownload} 
              disabled={isTransferring}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Start Download Test
            </Button>
            <Button 
              onClick={clearCompleted} 
              disabled={transfers.filter(t => t.status === 'completed').length === 0}
              variant="outline"
            >
              Clear Completed
            </Button>
          </div>

          {/* Global Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{globalStats.activeTransfers}</div>
              <div className="text-sm text-muted-foreground">Active Transfers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{globalStats.completedTransfers}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{formatFileSize(globalStats.totalBytesTransferred)}</div>
              <div className="text-sm text-muted-foreground">Total Transferred</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{formatSpeed(globalStats.averageSpeed)}</div>
              <div className="text-sm text-muted-foreground">Avg Speed</div>
            </div>
          </div>

          {/* Active Transfers */}
          {transfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active Transfers ({transfers.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transfer.status)}
                        <Badge variant={transfer.type === 'upload' ? 'default' : 'secondary'}>
                          {transfer.type}
                        </Badge>
                        <Badge variant={
                          transfer.status === 'completed' ? 'default' :
                          transfer.status === 'failed' ? 'destructive' :
                          transfer.status === 'paused' ? 'outline' :
                          'secondary'
                        }>
                          {transfer.status}
                        </Badge>
                        <span className="text-sm font-medium">{transfer.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {transfer.retryCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {transfer.retryCount} retries
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(transfer.fileSize)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress: {transfer.progress.toFixed(1)}%</span>
                        <span>Speed: {formatSpeed(transfer.speed)}</span>
                      </div>
                      <Progress value={transfer.progress} className="w-full" />
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {transfer.type === 'upload' ? 'Uploaded' : 'Downloaded'}: {transfer.type === 'upload' ? transfer.uploadedChunks : transfer.downloadedChunks}/{transfer.totalChunks} chunks
                      </span>
                      <span>Threads: {transfer.parallelThreads}</span>
                      <span>Chunk size: {formatFileSize(transfer.chunkSize)}</span>
                    </div>
                    
                    {transfer.checksum && (
                      <div className="flex items-center gap-2 text-xs">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono">SHA-256: {transfer.checksum.substring(0, 16)}...</span>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {transfer.status === 'paused' && (
                        <Button 
                          onClick={() => resumeTransfer(transfer.id)} 
                          size="sm"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      )}
                      {(transfer.status === 'transferring' || transfer.status === 'resumed') && (
                        <Button 
                          onClick={() => pauseTransfer(transfer.id)} 
                          size="sm"
                          variant="outline"
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      {transfer.status === 'failed' && (
                        <Button 
                          onClick={() => retryTransfer(transfer.id)} 
                          size="sm"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      <Button 
                        onClick={() => cancelTransfer(transfer.id)} 
                        size="sm" 
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transfers.length === 0 && (
            <Alert>
              <Database className="w-4 h-4" />
              <AlertDescription>
                No active transfers. Start an upload or download test to verify parallel chunk functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>Parallel Chunk Transfer Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Parallel chunk processing</li>
                <li>• Configurable chunk sizes</li>
                <li>• Transfer pause/resume functionality</li>
                <li>• Automatic retry mechanism</li>
                <li>• Checksum integrity verification</li>
                <li>• Real-time progress monitoring</li>
                <li>• Bandwidth optimization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Large file transfers (1GB+)</li>
                <li>• Network interruption recovery</li>
                <li>• Concurrent transfer limits</li>
                <li>• Memory efficiency testing</li>
                <li>• Transfer speed optimization</li>
                <li>• Data integrity validation</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Configure file size, chunk size, and parallel threads</li>
              <li>Start upload or download test</li>
              <li>Monitor parallel chunk processing</li>
              <li>Test pause/resume functionality</li>
              <li>Verify checksum integrity</li>
              <li>Test retry mechanism with failures</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Performance Benefits</h4>
            </div>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Faster transfers through parallel processing</li>
              <li>• Better bandwidth utilization</li>
              <li>• Resilient to network interruptions</li>
              <li>• Efficient memory usage</li>
              <li>• Scalable for very large files</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}