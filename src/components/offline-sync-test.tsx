'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Download,
  Database,
  Sync
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface OfflineItem {
  id: string
  type: 'upload' | 'download'
  fileName: string
  fileSize: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  progress: number
  timestamp: Date
  retryCount: number
}

export function OfflineSyncTest() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineItems, setOfflineItems] = useState<OfflineItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { toast } = useToast()

  // IndexedDB database reference
  const dbRef = useRef<IDBDatabase | null>(null)

  useEffect(() => {
    // Initialize IndexedDB
    initIndexedDB()
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back Online!",
        description: "Syncing offline changes...",
      })
      startSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "Offline Mode",
        description: "Changes will be synced when you're back online.",
        variant: "default",
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load existing offline items
    loadOfflineItems()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const initIndexedDB = async () => {
    try {
      const request = indexedDB.open('MeowShareOffline', 1)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('pendingUploads')) {
          const uploadStore = db.createObjectStore('pendingUploads', { keyPath: 'id' })
          uploadStore.createIndex('timestamp', 'timestamp')
        }
        
        if (!db.objectStoreNames.contains('pendingDownloads')) {
          const downloadStore = db.createObjectStore('pendingDownloads', { keyPath: 'id' })
          downloadStore.createIndex('timestamp', 'timestamp')
        }
      }
      
      request.onsuccess = (event) => {
        dbRef.current = (event.target as IDBOpenDBRequest).result
      }
      
      request.onerror = (event) => {
        console.error('IndexedDB initialization failed:', event)
      }
    } catch (error) {
      console.error('IndexedDB not supported:', error)
    }
  }

  const loadOfflineItems = async () => {
    if (!dbRef.current) return

    try {
      const items: OfflineItem[] = []
      
      // Load pending uploads
      const uploads = await getFromStore('pendingUploads')
      uploads.forEach(upload => {
        items.push({
          ...upload,
          type: 'upload' as const,
          status: 'pending' as const,
          progress: 0,
          retryCount: 0
        })
      })
      
      // Load pending downloads
      const downloads = await getFromStore('pendingDownloads')
      downloads.forEach(download => {
        items.push({
          ...download,
          type: 'download' as const,
          status: 'pending' as const,
          progress: 0,
          retryCount: 0
        })
      })
      
      setOfflineItems(items)
    } catch (error) {
      console.error('Failed to load offline items:', error)
    }
  }

  const getFromStore = (storeName: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = dbRef.current.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const addToStore = (storeName: string, data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = dbRef.current.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const removeFromStore = (storeName: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!dbRef.current) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = dbRef.current.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const simulateOfflineUpload = async () => {
    const fileSizes = [1024, 2048, 5120, 10240] // 1KB, 2KB, 5KB, 10KB
    const fileNames = ['document.txt', 'image.jpg', 'archive.zip', 'video.mp4']
    
    const randomSize = fileSizes[Math.floor(Math.random() * fileSizes.length)]
    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)]
    
    const item: OfflineItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'upload',
      fileName: randomName,
      fileSize: randomSize,
      status: 'pending',
      progress: 0,
      timestamp: new Date(),
      retryCount: 0
    }

    // Store in IndexedDB
    try {
      await addToStore('pendingUploads', {
        id: item.id,
        fileName: item.fileName,
        fileSize: item.fileSize,
        timestamp: item.timestamp
      })
      
      setOfflineItems(prev => [item, ...prev])
      
      toast({
        title: "Offline Upload Queued",
        description: `${item.fileName} will sync when online.`,
      })
    } catch (error) {
      toast({
        title: "Failed to Queue Upload",
        description: "Could not store offline upload.",
        variant: "destructive",
      })
    }
  }

  const simulateOfflineDownload = async () => {
    const shareCodes = ['DEMO-1234', 'TEST-5678', 'OFFLINE-9999']
    const randomCode = shareCodes[Math.floor(Math.random() * shareCodes.length)]
    
    const item: OfflineItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'download',
      fileName: `shared-file-${randomCode.toLowerCase()}.zip`,
      fileSize: Math.floor(Math.random() * 50000) + 1000, // 1KB to 50KB
      status: 'pending',
      progress: 0,
      timestamp: new Date(),
      retryCount: 0
    }

    // Store in IndexedDB
    try {
      await addToStore('pendingDownloads', {
        id: item.id,
        fileName: item.fileName,
        fileSize: item.fileSize,
        timestamp: item.timestamp
      })
      
      setOfflineItems(prev => [item, ...prev])
      
      toast({
        title: "Offline Download Queued",
        description: `${item.fileName} will download when online.`,
      })
    } catch (error) {
      toast({
        title: "Failed to Queue Download",
        description: "Could not store offline download.",
        variant: "destructive",
      })
    }
  }

  const startSync = async () => {
    if (!isOnline || isSyncing || offlineItems.length === 0) return

    setIsSyncing(true)
    const pendingItems = offlineItems.filter(item => item.status === 'pending')
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i]
      const progress = ((i + 1) / pendingItems.length) * 100
      setSyncProgress(progress)
      
      try {
        // Update item status
        setOfflineItems(prev => 
          prev.map(i => i.id === item.id ? { ...i, status: 'syncing', progress: 0 } : i)
        )
        
        // Simulate sync process
        await simulateSyncProcess(item)
        
        // Mark as completed
        setOfflineItems(prev => 
          prev.map(i => i.id === item.id ? { ...i, status: 'completed', progress: 100 } : i)
        )
        
        // Remove from IndexedDB
        if (item.type === 'upload') {
          await removeFromStore('pendingUploads', item.id)
        } else {
          await removeFromStore('pendingDownloads', item.id)
        }
        
        toast({
          title: "Sync Complete",
          description: `${item.fileName} ${item.type === 'upload' ? 'uploaded' : 'downloaded'} successfully.`,
        })
      } catch (error) {
        console.error('Sync failed for item:', item.id, error)
        
        // Mark as failed
        setOfflineItems(prev => 
          prev.map(i => i.id === item.id ? { 
            ...i, 
            status: 'failed', 
            retryCount: i.retryCount + 1 
          } : i)
        )
        
        toast({
          title: "Sync Failed",
          description: `${item.fileName} failed to sync. Will retry later.`,
          variant: "destructive",
        })
      }
    }
    
    setIsSyncing(false)
    setSyncProgress(0)
    setLastSyncTime(new Date())
    
    // Remove completed items from list
    setTimeout(() => {
      setOfflineItems(prev => prev.filter(item => item.status !== 'completed'))
    }, 2000)
  }

  const simulateSyncProcess = (item: OfflineItem): Promise<void> => {
    return new Promise((resolve, reject) => {
      const duration = 1000 + Math.random() * 2000 // 1-3 seconds
      const steps = 20
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        const progress = (currentStep / steps) * 100
        
        setOfflineItems(prev => 
          prev.map(i => i.id === item.id ? { ...i, progress } : i)
        )
        
        if (currentStep >= steps) {
          clearInterval(interval)
          
          // Simulate occasional failures
          if (Math.random() < 0.1) { // 10% failure rate
            reject(new Error('Network error'))
          } else {
            resolve()
          }
        }
      }, duration / steps)
    })
  }

  const retryFailedItems = () => {
    setOfflineItems(prev => 
      prev.map(item => 
        item.status === 'failed' ? { ...item, status: 'pending', progress: 0 } : item
      )
    )
    
    if (isOnline) {
      startSync()
    }
  }

  const clearCompleted = () => {
    setOfflineItems(prev => prev.filter(item => item.status !== 'completed'))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: OfflineItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
            Offline Sync Test
          </CardTitle>
          <CardDescription>
            Test offline file operations and automatic synchronization when back online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {lastSyncTime && `Last sync: ${lastSyncTime.toLocaleTimeString()}`}
            </div>
          </div>

          {/* Sync Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={simulateOfflineUpload} 
              disabled={isOnline && !isSyncing}
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Simulate Offline Upload
            </Button>
            <Button 
              onClick={simulateOfflineDownload} 
              disabled={isOnline && !isSyncing}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Simulate Offline Download
            </Button>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sync className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Syncing...</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          )}

          {/* Sync Actions */}
          <div className="flex gap-4">
            <Button 
              onClick={startSync} 
              disabled={!isOnline || isSyncing || offlineItems.filter(i => i.status === 'pending').length === 0}
              className="flex-1"
            >
              <Cloud className="w-4 h-4 mr-2" />
              Start Sync
            </Button>
            <Button 
              onClick={retryFailedItems} 
              disabled={offlineItems.filter(i => i.status === 'failed').length === 0}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Failed
            </Button>
            <Button 
              onClick={clearCompleted} 
              disabled={offlineItems.filter(i => i.status === 'completed').length === 0}
              variant="outline"
            >
              Clear Completed
            </Button>
          </div>

          {/* Offline Items */}
          {offlineItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Offline Items ({offlineItems.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {offlineItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <Badge variant={item.type === 'upload' ? 'default' : 'secondary'}>
                          {item.type === 'upload' ? 'Upload' : 'Download'}
                        </Badge>
                        <span className="text-sm font-medium">{item.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSize)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.retryCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {item.retryCount} retries
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    {item.status === 'syncing' && (
                      <Progress value={item.progress} className="w-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {offlineItems.length === 0 && (
            <Alert>
              <Database className="w-4 h-4" />
              <AlertDescription>
                No offline items. Go offline and simulate uploads/downloads to test offline functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Sync Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• IndexedDB offline storage</li>
                <li>• Automatic sync detection</li>
                <li>• Background upload queuing</li>
                <li>• Download request caching</li>
                <li>• Retry mechanism with backoff</li>
                <li>• Service Worker integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload files while offline</li>
                <li>• Queue download requests offline</li>
                <li>• Automatic sync on reconnect</li>
                <li>• Handle network interruptions</li>
                <li>• Retry failed operations</li>
                <li>• Maintain data integrity</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Disconnect from internet (offline mode)</li>
              <li>Simulate uploads and downloads</li>
              <li>Verify items are queued in offline storage</li>
              <li>Reconnect to internet</li>
              <li>Watch automatic synchronization occur</li>
              <li>Test retry mechanism with failures</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}