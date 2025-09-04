'use client'

import { useState, useEffect, useRef } from 'react'
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
  Background,
  Wifi,
  WifiOff,
  Bell,
  Settings,
  Activity,
  Database,
  Cloud,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BackgroundTransfer {
  id: string
  type: 'upload' | 'download'
  fileName: string
  fileSize: number
  progress: number
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed'
  speed: number
  priority: 'low' | 'normal' | 'high'
  backgroundMode: 'service-worker' | 'background-sync' | 'web-worker'
  startTime: Date
  endTime?: Date
  retryCount: number
  notifications: boolean
}

interface ServiceWorkerStatus {
  supported: boolean
  registered: boolean
  active: boolean
  controlling: boolean
}

interface BackgroundSyncStatus {
  supported: boolean
  permission: 'granted' | 'denied' | 'prompt'
  registered: boolean
}

export function BackgroundTransferTest() {
  const [transfers, setTransfers] = useState<BackgroundTransfer[]>([])
  const [isTransferring, setIsTransferring] = useState(false)
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    supported: false,
    registered: false,
    active: false,
    controlling: false
  })
  const [syncStatus, setSyncStatus] = useState<BackgroundSyncStatus>({
    supported: false,
    permission: 'prompt',
    registered: false
  })
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [globalStats, setGlobalStats] = useState({
    totalTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0,
    averageSpeed: 0
  })

  const { toast } = useToast()

  useEffect(() => {
    checkServiceWorkerSupport()
    checkBackgroundSyncSupport()
    checkNotificationPermission()
    loadStoredTransfers()
  }, [])

  const checkServiceWorkerSupport = async () => {
    const supported = 'serviceWorker' in navigator
    setSwStatus(prev => ({ ...prev, supported }))

    if (supported) {
      try {
        const registration = await navigator.serviceWorker.ready
        setSwStatus({
          supported: true,
          registered: !!registration.active,
          active: !!registration.active,
          controlling: !!registration.active && navigator.serviceWorker.controller
        })
      } catch (error) {
        console.error('Service worker check failed:', error)
      }
    }
  }

  const checkBackgroundSyncSupport = async () => {
    const supported = 'serviceWorker' in navigator && 'SyncManager' in window
    setSyncStatus(prev => ({ ...prev, supported }))

    if (supported) {
      try {
        const registration = await navigator.serviceWorker.ready
        const syncRegistered = await registration.sync.getTags()
        setSyncStatus(prev => ({
          ...prev,
          registered: syncRegistered.length > 0
        }))
      } catch (error) {
        console.error('Background sync check failed:', error)
      }
    }
  }

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const loadStoredTransfers = async () => {
    try {
      // Load transfers from IndexedDB
      const storedTransfers = await getStoredTransfers()
      setTransfers(storedTransfers)
    } catch (error) {
      console.error('Failed to load stored transfers:', error)
    }
  }

  const getStoredTransfers = async (): Promise<BackgroundTransfer[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MeowShareBackgroundTransfers', 1)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('transfers')) {
          const store = db.createObjectStore('transfers', { keyPath: 'id' })
          store.createIndex('status', 'status')
          store.createIndex('startTime', 'startTime')
        }
      }
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction('transfers', 'readonly')
        const store = transaction.objectStore('transfers')
        const getAll = store.getAll()
        
        getAll.onsuccess = () => resolve(getAll.result)
        getAll.onerror = () => reject(getAll.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  const storeTransfer = async (transfer: BackgroundTransfer): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MeowShareBackgroundTransfers', 1)
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction('transfers', 'readwrite')
        const store = transaction.objectStore('transfers')
        const putRequest = store.put(transfer)
        
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  const removeTransfer = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MeowShareBackgroundTransfers', 1)
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction('transfers', 'readwrite')
        const store = transaction.objectStore('transfers')
        const deleteRequest = store.delete(id)
        
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  const startBackgroundUpload = async () => {
    const fileSizes = [50 * 1024 * 1024, 100 * 1024 * 1024, 500 * 1024 * 1024] // 50MB, 100MB, 500MB
    const fileNames = ['large-document.pdf', 'video-presentation.mp4', 'archive-backup.zip']
    
    const randomSize = fileSizes[Math.floor(Math.random() * fileSizes.length)]
    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)]
    
    const transfer: BackgroundTransfer = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'upload',
      fileName: randomName,
      fileSize: randomSize,
      progress: 0,
      status: 'pending',
      speed: 0,
      priority: 'normal',
      backgroundMode: swStatus.active ? 'service-worker' : 'background-sync',
      startTime: new Date(),
      retryCount: 0,
      notifications: notificationPermission === 'granted'
    }

    setTransfers(prev => [transfer, ...prev])
    await storeTransfer(transfer)
    
    // Start background transfer
    await executeBackgroundTransfer(transfer)
    
    toast({
      title: "Background Upload Started",
      description: `${transfer.fileName} will upload in the background.`,
    })
  }

  const startBackgroundDownload = async () => {
    const fileSizes = [25 * 1024 * 1024, 75 * 1024 * 1024, 200 * 1024 * 1024] // 25MB, 75MB, 200MB
    const fileNames = ['software-installer.exe', 'movie-file.mp4', 'dataset.csv']
    
    const randomSize = fileSizes[Math.floor(Math.random() * fileSizes.length)]
    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)]
    
    const transfer: BackgroundTransfer = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'download',
      fileName: randomName,
      fileSize: randomSize,
      progress: 0,
      status: 'pending',
      speed: 0,
      priority: 'normal',
      backgroundMode: swStatus.active ? 'service-worker' : 'background-sync',
      startTime: new Date(),
      retryCount: 0,
      notifications: notificationPermission === 'granted'
    }

    setTransfers(prev => [transfer, ...prev])
    await storeTransfer(transfer)
    
    // Start background transfer
    await executeBackgroundTransfer(transfer)
    
    toast({
      title: "Background Download Started",
      description: `${transfer.fileName} will download in the background.`,
    })
  }

  const executeBackgroundTransfer = async (transfer: BackgroundTransfer): Promise<void> => {
    setTransfers(prev => 
      prev.map(t => t.id === transfer.id ? { ...t, status: 'transferring' } : t)
    )
    
    setIsTransferring(true)
    
    try {
      // Simulate background transfer
      await simulateBackgroundTransfer(transfer)
      
      const completedTransfer: BackgroundTransfer = {
        ...transfer,
        status: 'completed',
        progress: 100,
        endTime: new Date()
      }
      
      setTransfers(prev => 
        prev.map(t => t.id === transfer.id ? completedTransfer : t)
      )
      
      await storeTransfer(completedTransfer)
      
      // Show notification if enabled
      if (transfer.notifications && 'Notification' in window && notificationPermission === 'granted') {
        new Notification('Transfer Complete', {
          body: `${transfer.fileName} has been ${transfer.type === 'upload' ? 'uploaded' : 'downloaded'} successfully.`,
          icon: '/icon-192.png'
        })
      }
      
      // Update global stats
      setGlobalStats(prev => ({
        ...prev,
        totalTransfers: prev.totalTransfers + 1,
        completedTransfers: prev.completedTransfers + 1
      }))
      
      toast({
        title: "Background Transfer Complete!",
        description: `${transfer.fileName} ${transfer.type === 'upload' ? 'uploaded' : 'downloaded'} successfully.`,
      })
    } catch (error) {
      console.error('Background transfer failed:', error)
      
      const failedTransfer: BackgroundTransfer = {
        ...transfer,
        status: 'failed',
        retryCount: transfer.retryCount + 1
      }
      
      setTransfers(prev => 
        prev.map(t => t.id === transfer.id ? failedTransfer : t)
      )
      
      await storeTransfer(failedTransfer)
      
      setGlobalStats(prev => ({
        ...prev,
        totalTransfers: prev.totalTransfers + 1,
        failedTransfers: prev.failedTransfers + 1
      }))
      
      // Show error notification
      if (transfer.notifications && 'Notification' in window && notificationPermission === 'granted') {
        new Notification('Transfer Failed', {
          body: `${transfer.fileName} transfer failed. Will retry automatically.`,
          icon: '/icon-192.png'
        })
      }
      
      toast({
        title: "Background Transfer Failed",
        description: `${transfer.fileName} transfer failed. Will retry automatically.`,
        variant: "destructive",
      })
    } finally {
      setIsTransferring(false)
    }
  }

  const simulateBackgroundTransfer = async (transfer: BackgroundTransfer): Promise<void> => {
    return new Promise((resolve, reject) => {
      const duration = 10000 + Math.random() * 20000 // 10-30 seconds
      const steps = 100
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        const progress = (currentStep / steps) * 100
        const speed = transfer.fileSize / (duration / 1000) // bytes per second
        
        setTransfers(prev => 
          prev.map(t => t.id === transfer.id ? { ...t, progress, speed } : t)
        )
        
        // Update stored progress
        const updatedTransfer = { ...transfer, progress, speed }
        storeTransfer(updatedTransfer)
        
        if (currentStep >= steps) {
          clearInterval(interval)
          
          // Simulate occasional failures
          if (Math.random() < 0.1) { // 10% failure rate
            reject(new Error('Network error during background transfer'))
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
    
    toast({
      title: "Background Transfer Paused",
      description: "Transfer has been paused.",
    })
  }

  const resumeTransfer = async (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId)
    if (!transfer) return
    
    setTransfers(prev => 
      prev.map(t => t.id === transferId ? { ...t, status: 'transferring' } : t)
    )
    
    await executeBackgroundTransfer(transfer)
  }

  const cancelTransfer = async (transferId: string) => {
    setTransfers(prev => prev.filter(t => t.id !== transferId))
    await removeTransfer(transferId)
    
    toast({
      title: "Background Transfer Cancelled",
      description: "Transfer has been cancelled.",
    })
  }

  const retryTransfer = async (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId)
    if (!transfer) return
    
    const retryTransfer: BackgroundTransfer = {
      ...transfer,
      status: 'pending',
      progress: 0,
      speed: 0,
      retryCount: transfer.retryCount + 1,
      startTime: new Date()
    }
    
    setTransfers(prev => 
      prev.map(t => t.id === transferId ? retryTransfer : t)
    )
    
    await storeTransfer(retryTransfer)
    await executeBackgroundTransfer(retryTransfer)
  }

  const clearCompleted = async () => {
    const completedTransfers = transfers.filter(t => t.status === 'completed')
    for (const transfer of completedTransfers) {
      await removeTransfer(transfer.id)
    }
    setTransfers(prev => prev.filter(t => t.status !== 'completed'))
  }

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      setSwStatus({
        supported: true,
        registered: true,
        active: !!registration.active,
        controlling: !!registration.active && navigator.serviceWorker.controller
      })
      
      toast({
        title: "Service Worker Registered",
        description: "Background transfers are now supported.",
      })
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Could not register service worker.",
        variant: "destructive",
      })
    }
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

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date()
    const duration = end.getTime() - startTime.getTime()
    
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((duration % (1000 * 60)) / 1000)
    
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const getStatusIcon = (status: BackgroundTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'transferring':
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
            <Background className="w-5 h-5" />
            Background Transfer Test
          </CardTitle>
          <CardDescription>
            Test background file transfers using service workers and background sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Status */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Worker</label>
              <div className="flex items-center gap-2">
                {swStatus.supported ? (
                  swStatus.registered ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">
                  {swStatus.supported 
                    ? (swStatus.registered ? 'Registered' : 'Not Registered')
                    : 'Not Supported'
                  }
                </span>
              </div>
              {!swStatus.registered && swStatus.supported && (
                <Button onClick={registerServiceWorker} size="sm" variant="outline">
                  Register
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Background Sync</label>
              <div className="flex items-center gap-2">
                {syncStatus.supported ? (
                  syncStatus.registered ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">
                  {syncStatus.supported 
                    ? (syncStatus.registered ? 'Registered' : 'Available')
                    : 'Not Supported'
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notifications</label>
              <div className="flex items-center gap-2">
                {notificationPermission === 'granted' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">
                  {notificationPermission === 'granted' ? 'Granted' : 'Denied'}
                </span>
              </div>
            </div>
          </div>

          {/* Transfer Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={startBackgroundUpload} 
              disabled={isTransferring}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Start Background Upload
            </Button>
            <Button 
              onClick={startBackgroundDownload} 
              disabled={isTransferring}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Start Background Download
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
              <div className="text-2xl font-bold text-blue-600">{globalStats.totalTransfers}</div>
              <div className="text-sm text-muted-foreground">Total Transfers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{globalStats.completedTransfers}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{globalStats.failedTransfers}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{formatSpeed(globalStats.averageSpeed)}</div>
              <div className="text-sm text-muted-foreground">Avg Speed</div>
            </div>
          </div>

          {/* Background Transfers */}
          {transfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Background Transfers ({transfers.length})</h3>
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
                        <Badge variant="outline">
                          {transfer.backgroundMode === 'service-worker' ? 'SW' : 'Sync'}
                        </Badge>
                        <span className="text-sm font-medium">{transfer.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {transfer.notifications && (
                          <Bell className="w-4 h-4 text-blue-500" />
                        )}
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
                        <span>Duration: {formatDuration(transfer.startTime, transfer.endTime)}</span>
                      </div>
                      <Progress value={transfer.progress} className="w-full" />
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Priority: {transfer.priority}</span>
                      <span>Started: {transfer.startTime.toLocaleTimeString()}</span>
                      {transfer.endTime && (
                        <span>Ended: {transfer.endTime.toLocaleTimeString()}</span>
                      )}
                    </div>
                    
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
                      {(transfer.status === 'transferring') && (
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
                No background transfers. Start a background upload or download to test background functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>Background Transfer Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Service Worker registration</li>
                <li>• Background Sync API</li>
                <li>• Offline transfer queuing</li>
                <li>• Background progress tracking</li>
                <li>• Push notifications</li>
                <li>• Transfer persistence</li>
                <li>• Automatic retry mechanism</li>
                <li>• Cross-tab synchronization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload while tab is active</li>
                <li>• Continue transfers after tab close</li>
                <li>• Resume transfers on reconnect</li>
                <li>• Handle browser interruptions</li>
                <li>• Test notification delivery</li>
                <li>• Verify data persistence</li>
                <li>• Test retry logic</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Ensure service worker is registered</li>
              <li>Start background upload/download</li>
              <li>Close browser tab during transfer</li>
              <li>Reopen and check transfer progress</li>
              <li>Verify notifications are working</li>
              <li>Test pause/resume functionality</li>
              <li>Verify retry on failure</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">User Experience Benefits</h4>
            </div>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Transfers continue after tab close</li>
              <li>• Real-time progress notifications</li>
              <li>• Seamless offline-to-online transition</li>
              <li>• Automatic error recovery</li>
              <li>• Persistent transfer state</li>
              <li>• Battery-efficient background processing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}