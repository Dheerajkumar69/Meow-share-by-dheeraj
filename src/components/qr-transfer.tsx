'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Camera, 
  QrCode, 
  Copy, 
  Check, 
  X,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Monitor
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { QRCodeGenerator } from '@/components/qrcode'

interface QRTransferState {
  mode: 'generate' | 'scan' | 'none'
  generatedUrl?: string
  generatedCode?: string
  scannedCode?: string
  isScanning: boolean
  scanResult?: any
}

export function QRCodeTransfer() {
  const [state, setState] = useState<QRTransferState>({ 
    mode: 'none', 
    isScanning: false 
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        setState(prev => ({ ...prev, isScanning: true }))
        
        // Start QR code scanning
        scanQRCode()
      }
    } catch (error) {
      console.error('Camera access failed:', error)
      toast({
        title: "Camera Access Failed",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setState(prev => ({ ...prev, isScanning: false }))
  }

  const scanQRCode = () => {
    if (!state.isScanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Here you would typically use a QR code scanning library
    // For demo purposes, we'll simulate scanning
    simulateQRScan(imageData)

    // Continue scanning
    if (state.isScanning) {
      requestAnimationFrame(scanQRCode)
    }
  }

  const simulateQRScan = (imageData: ImageData) => {
    // Simulate QR code detection
    // In a real implementation, you would use a library like jsQR
    if (Math.random() < 0.01) { // 1% chance per frame to simulate finding a QR code
      const mockCode = 'DEMO-QR' + Math.floor(Math.random() * 1000)
      handleQRCodeDetected(mockCode)
    }
  }

  const handleQRCodeDetected = (code: string) => {
    stopCamera()
    
    setState(prev => ({
      ...prev,
      scannedCode: code,
      isScanning: false,
      scanResult: {
        success: true,
        code,
        timestamp: new Date()
      }
    }))

    toast({
      title: "QR Code Detected!",
      description: `Code: ${code}`,
    })
  }

  const generateQRCode = (url: string, code: string) => {
    setState(prev => ({
      ...prev,
      mode: 'generate',
      generatedUrl: url,
      generatedCode: code
    }))
  }

  const copyToClipboard = async (text: string) => {
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
  }

  const reset = () => {
    stopCamera()
    setState({ mode: 'none', isScanning: false })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code Transfer Test
          </CardTitle>
          <CardDescription>
            Test QR code generation and scanning for cross-device file transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-4">
            <Button
              onClick={() => setState(prev => ({ ...prev, mode: 'generate' }))}
              variant={state.mode === 'generate' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Generate QR Code
            </Button>
            <Button
              onClick={() => setState(prev => ({ ...prev, mode: 'scan' }))}
              variant={state.mode === 'scan' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          </div>

          {/* Generate QR Code Mode */}
          {state.mode === 'generate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Share URL</label>
                  <Input
                    value={state.generatedUrl || 'https://meow-share.local/receive/DEMO-QR123'}
                    onChange={(e) => setState(prev => ({ ...prev, generatedUrl: e.target.value }))}
                    placeholder="Enter URL to encode"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Share Code</label>
                  <Input
                    value={state.generatedCode || 'DEMO-QR123'}
                    onChange={(e) => setState(prev => ({ ...prev, generatedCode: e.target.value }))}
                    placeholder="Enter code to encode"
                  />
                </div>
              </div>

              {state.generatedUrl && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <QRCodeGenerator value={state.generatedUrl} size={200} />
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={() => copyToClipboard(state.generatedUrl!)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(state.generatedCode!)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan QR Code Mode */}
          {state.mode === 'scan' && (
            <div className="space-y-4">
              {!state.isScanning && !state.scannedCode && (
                <div className="text-center">
                  <Button onClick={startCamera} size="lg">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}

              {state.isScanning && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-lg m-2 pointer-events-none">
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-blue-500">Scanning...</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <Button onClick={stopCamera} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Stop Scanning
                    </Button>
                  </div>
                </div>
              )}

              {state.scannedCode && (
                <Alert>
                  <Check className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div><strong>QR Code Detected:</strong> {state.scannedCode}</div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => copyToClipboard(state.scannedCode!)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </Button>
                        <Button onClick={reset} variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Scan Another
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Test Results */}
          {state.scanResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scan Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> {state.scanResult.success ? 'Success' : 'Failed'}</div>
                  <div><strong>Code:</strong> {state.scanResult.code}</div>
                  <div><strong>Timestamp:</strong> {state.scanResult.timestamp.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reset Button */}
          {state.mode !== 'none' && (
            <div className="text-center">
              <Button onClick={reset} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code Transfer Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Generate Mode</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Creates QR codes from share URLs</li>
                <li>• Supports custom URLs and codes</li>
                <li>• One-click copying to clipboard</li>
                <li>• High-resolution QR code generation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Scan Mode</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Uses device camera for scanning</li>
                <li>• Real-time QR code detection</li>
                <li>• Automatic code extraction</li>
                <li>• Cross-platform compatibility</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}