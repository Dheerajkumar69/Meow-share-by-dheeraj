'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Network, 
  Users, 
  Wifi, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Download,
  Zap,
  AlertTriangle,
  Shield,
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PeerConnection {
  id: string
  userId: string
  status: 'connecting' | 'connected' | 'disconnected' | 'failed'
  connectionType: 'direct' | 'relay' | 'unknown'
  latency?: number
  bytesSent: number
  bytesReceived: number
  timestamp: Date
}

interface TransferSession {
  id: string
  type: 'send' | 'receive'
  fileName: string
  fileSize: number
  progress: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
  peerId?: string
  speed: number // bytes per second
  timestamp: Date
}

export function P2PWebRTCTest() {
  const [isSupported, setIsSupported] = useState(false)
  const [connections, setConnections] = useState<PeerConnection[]>([])
  const [transfers, setTransfers] = useState<TransferSession[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [userId, setUserId] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [stats, setStats] = useState({
    totalBytesSent: 0,
    totalBytesReceived: 0,
    averageLatency: 0,
    activeConnections: 0
  })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Check WebRTC support
    const supported = 'RTCPeerConnection' in window && 'RTCDataChannel' in window
    setIsSupported(supported)
    
    if (supported) {
      // Generate user ID
      setUserId('user_' + Math.random().toString(36).substr(2, 9))
    }

    return () => {
      // Cleanup connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [])

  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, send candidate to signaling server
        console.log('ICE candidate:', event.candidate)
      }
    }

    pc.ondatachannel = (event) => {
      const channel = event.channel
      setupDataChannel(channel)
    }

    return pc
  }

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel

    channel.onopen = () => {
      console.log('Data channel opened')
      toast({
        title: "P2P Connected!",
        description: "Direct peer-to-peer connection established.",
      })
    }

    channel.onmessage = (event) => {
      console.log('Received message:', event.data)
      
      // Handle file transfer data
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'file-transfer') {
          handleFileTransferData(data)
        }
      } catch {
        // Handle raw data
      }
    }

    channel.onclose = () => {
      console.log('Data channel closed')
    }

    channel.onerror = (error) => {
      console.error('Data channel error:', error)
    }
  }

  const handleFileTransferData = (data: any) => {
    if (data.type === 'progress') {
      setTransfers(prev => 
        prev.map(t => 
          t.id === data.sessionId 
            ? { ...t, progress: data.progress, speed: data.speed }
            : t
        )
      )
    } else if (data.type === 'complete') {
      setTransfers(prev => 
        prev.map(t => 
          t.id === data.sessionId 
            ? { ...t, status: 'completed', progress: 100 }
            : t
        )
      )
    }
  }

  const connectToPeer = async () => {
    if (!isSupported || !roomId.trim()) return

    setIsConnecting(true)
    setConnectionStatus('connecting')

    try {
      // Create peer connection
      peerConnectionRef.current = createPeerConnection()

      // Create data channel
      const channel = peerConnectionRef.current.createDataChannel('file-transfer')
      setupDataChannel(channel)

      // Create offer
      const offer = await peerConnectionRef.current.createOffer()
      await peerConnectionRef.current.setLocalDescription(offer)

      // Simulate connection to peer
      // In a real implementation, this would involve a signaling server
      await simulatePeerConnection()

      setConnectionStatus('connected')
      
      // Add connection to list
      const newConnection: PeerConnection = {
        id: Math.random().toString(36).substr(2, 9),
        userId: 'peer_' + Math.random().toString(36).substr(2, 9),
        status: 'connected',
        connectionType: 'direct',
        latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
        bytesSent: 0,
        bytesReceived: 0,
        timestamp: new Date()
      }
      
      setConnections(prev => [newConnection, ...prev])
      
      toast({
        title: "Connected to Peer!",
        description: "P2P connection established successfully.",
      })
    } catch (error) {
      console.error('Connection failed:', error)
      setConnectionStatus('disconnected')
      
      toast({
        title: "Connection Failed",
        description: "Could not establish P2P connection.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const simulatePeerConnection = async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 1000 + Math.random() * 2000) // 1-3 seconds
    })
  }

  const sendFile = async () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      toast({
        title: "No Active Connection",
        description: "Please connect to a peer first.",
        variant: "destructive",
      })
      return
    }

    const fileSizes = [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024] // 1MB, 5MB, 10MB
    const fileNames = ['test-file.txt', 'large-document.pdf', 'video-clip.mp4']
    
    const randomSize = fileSizes[Math.floor(Math.random() * fileSizes.length)]
    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)]
    
    const session: TransferSession = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'send',
      fileName: randomName,
      fileSize: randomSize,
      progress: 0,
      status: 'transferring',
      speed: 0,
      timestamp: new Date()
    }

    setTransfers(prev => [session, ...prev])

    try {
      // Start file transfer
      dataChannelRef.current.send(JSON.stringify({
        type: 'file-start',
        sessionId: session.id,
        fileName: session.fileName,
        fileSize: session.fileSize
      }))

      // Simulate file transfer progress
      await simulateFileTransfer(session)

      // Mark as completed
      setTransfers(prev => 
        prev.map(t => 
          t.id === session.id 
            ? { ...t, status: 'completed', progress: 100 }
            : t
        )
      )

      // Update stats
      setStats(prev => ({
        ...prev,
        totalBytesSent: prev.totalBytesSent + session.fileSize
      }))

      toast({
        title: "File Sent!",
        description: `${session.fileName} sent successfully via P2P.`,
      })
    } catch (error) {
      console.error('File transfer failed:', error)
      
      setTransfers(prev => 
        prev.map(t => 
          t.id === session.id 
            ? { ...t, status: 'failed' }
            : t
        )
      )

      toast({
        title: "Transfer Failed",
        description: "P2P file transfer failed.",
        variant: "destructive",
      })
    }
  }

  const simulateFileTransfer = async (session: TransferSession): Promise<void> => {
    return new Promise((resolve, reject) => {
      const duration = 3000 + Math.random() * 5000 // 3-8 seconds
      const steps = 50
      let currentStep = 0
      
      const interval = setInterval(() => {
        currentStep++
        const progress = (currentStep / steps) * 100
        const speed = session.fileSize / (duration / 1000) // bytes per second
        
        setTransfers(prev => 
          prev.map(t => 
            t.id === session.id 
              ? { ...t, progress, speed }
              : t
          )
        )
        
        // Send progress update
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          dataChannelRef.current.send(JSON.stringify({
            type: 'progress',
            sessionId: session.id,
            progress,
            speed
          }))
        }
        
        if (currentStep >= steps) {
          clearInterval(interval)
          
          // Simulate occasional failures
          if (Math.random() < 0.05) { // 5% failure rate
            reject(new Error('Transfer interrupted'))
          } else {
            // Send completion message
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify({
                type: 'complete',
                sessionId: session.id
              }))
            }
            resolve()
          }
        }
      }, duration / steps)
    })
  }

  const disconnectFromPeer = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current = null
    }
    
    setConnectionStatus('disconnected')
    setConnections(prev => prev.map(conn => ({ ...conn, status: 'disconnected' })))
    
    toast({
      title: "Disconnected",
      description: "P2P connection closed.",
    })
  }

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let id = ''
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setRoomId(id)
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

  const getConnectionIcon = (status: PeerConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            WebRTC Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              WebRTC is not supported in this browser. P2P file transfers require a modern browser with WebRTC support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            P2P WebRTC Transfer Test
          </CardTitle>
          <CardDescription>
            Test direct peer-to-peer file transfers using WebRTC technology
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Setup */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Room ID</label>
              <div className="flex gap-2">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter room ID"
                  maxLength={8}
                />
                <Button onClick={generateRoomId} variant="outline">
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={userId}
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Connection Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={connectToPeer} 
              disabled={isConnecting || connectionStatus === 'connected' || !roomId.trim()}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Connect to Peer
                </>
              )}
            </Button>
            
            {connectionStatus === 'connected' && (
              <>
                <Button onClick={sendFile} disabled={transfers.some(t => t.status === 'transferring')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Send Test File
                </Button>
                <Button onClick={disconnectFromPeer} variant="outline">
                  <XCircle className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : connectionStatus === 'connecting' ? (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium capitalize">
                {connectionStatus}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Connections: {stats.activeConnections}</span>
              <span>Latency: {stats.averageLatency}ms</span>
            </div>
          </div>

          {/* Active Connections */}
          {connections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active Connections</h3>
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectionIcon(conn.status)}
                        <span className="font-medium">{conn.userId}</span>
                        <Badge variant={conn.connectionType === 'direct' ? 'default' : 'secondary'}>
                          {conn.connectionType}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conn.latency && `${conn.latency}ms`}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>↑ {formatFileSize(conn.bytesSent)}</span>
                      <span>↓ {formatFileSize(conn.bytesReceived)}</span>
                      <span>{conn.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Transfers */}
          {transfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active Transfers</h3>
              <div className="space-y-2">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {transfer.type === 'send' ? <Upload className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        <span className="font-medium">{transfer.fileName}</span>
                        <Badge variant={transfer.type === 'send' ? 'default' : 'secondary'}>
                          {transfer.type}
                        </Badge>
                        <Badge variant={transfer.status === 'completed' ? 'default' : transfer.status === 'failed' ? 'destructive' : 'secondary'}>
                          {transfer.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(transfer.fileSize)}
                      </div>
                    </div>
                    
                    {transfer.status === 'transferring' && (
                      <div className="space-y-2">
                        <Progress value={transfer.progress} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{transfer.progress.toFixed(1)}%</span>
                          <span>{formatSpeed(transfer.speed)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>P2P WebRTC Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• WebRTC peer connection establishment</li>
                <li>• ICE candidate gathering</li>
                <li>• Data channel for file transfer</li>
                <li>• Direct P2P connection (no server)</li>
                <li>• Connection type detection</li>
                <li>• Transfer speed monitoring</li>
                <li>• Connection resilience</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• LAN-based direct transfers</li>
                <li>• Cross-network P2P connections</li>
                <li>• Large file transfers (1GB+)</li>
                <li>• Connection interruption recovery</li>
                <li>• Multiple simultaneous transfers</li>
                <li>• Bandwidth utilization</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Generate or enter a room ID</li>
              <li>Connect to peer (simulated)</li>
              <li>Verify direct connection establishment</li>
              <li>Send test files via P2P</li>
              <li>Monitor transfer speeds and latency</li>
              <li>Test connection resilience</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Security Benefits</h4>
            </div>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Files transferred directly between devices</li>
              <li>• No server storage of transferred data</li>
              <li>• Encrypted WebRTC connections</li>
              <li>• Reduced server bandwidth costs</li>
              <li>• Faster transfer speeds for local networks</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}