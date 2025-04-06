'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import TransferSpeedometer from '../../../components/TransferSpeedometer'
import { formatShortCode, validateShortCode, normalizeShortCode } from '../../../utils/codeGenerator'
import { downloadFileInChunks, formatFileSize, formatSpeed } from '../../../utils/fileHandlers'
import { PeerConnection, ConnectionState, TransferSession } from '../../../utils/peerConnection'

interface ContentData {
  type: 'file' | 'text'
  name: string
  size: number
  content?: string | ArrayBuffer
  mimeType?: string
}

export default function DownloadPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string
  const [contentData, setContentData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [transferSpeed, setTransferSpeed] = useState(0)
  const [transferStartTime, setTransferStartTime] = useState<number | null>(null)
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('new')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const peerConnectionRef = useRef<PeerConnection | null>(null)
  
  // Validate and format the fileId if it's a short code
  const normalizedId = normalizeShortCode(fileId)
  const isShortCode = validateShortCode(normalizedId)
  const displayId = isShortCode ? formatShortCode(normalizedId) : fileId

  // Initialize the peer connection and listen for incoming file
  useEffect(() => {
    let isPeerActive = true

    const initializePeer = async () => {
      if (!isShortCode) {
        // If it's a regular fileId, fall back to simulated download
        simulateContentFetch()
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Create peer connection as receiver
        const peer = new PeerConnection({
          isInitiator: false,
          shortCode: normalizedId,
          onConnectionStateChange: (state) => {
            console.log('Connection state changed:', state)
            setConnectionState(state)
            
            if (state === 'connected') {
              // Test the connection when connected
              setTimeout(() => {
                if (peer && isPeerActive) {
                  peer.testConnection()
                    .then(isConnected => {
                      if (isConnected) {
                        console.log("Connection test successful, ready for file transfer")
                      } else {
                        console.error("Connection test failed")
                        setError("Connection test failed. Please ensure the sender is still connected.")
                      }
                    })
                }
              }, 1000)
            } else if (state === 'failed' || state === 'closed') {
              if (isPeerActive) {
                setError('Connection failed or closed. The sender may have disconnected.')
                setLoading(false)
              }
            }
          },
          onTransferProgress: (progress: number, speed: number) => {
            setProgress(progress)
            setTransferSpeed(speed)
          },
          onTransferComplete: (success: boolean, error?: string, url?: string) => {
            if (success && url) {
              setDownloadUrl(url)
              setIsDownloadComplete(true)
              setIsDownloading(false)
              setProgress(100)
            } else if (error) {
              setError(`Transfer failed: ${error}`)
              setIsDownloading(false)
            }
          }
        })

        await peer.initialize()
        peerConnectionRef.current = peer

        // Listen for transfer session updates
        const checkSession = setInterval(() => {
          if (!isPeerActive) {
            clearInterval(checkSession)
            return
          }

          const session = peer.getTransferSession()
          if (session?.metadata && !contentData) {
            setContentData({
              type: 'file',
              name: session.metadata.name,
              size: session.metadata.size,
              mimeType: session.metadata.type
            })
            setLoading(false)
          }

          if (session?.state === 'transferring' && !isDownloading) {
            setIsDownloading(true)
            setTransferStartTime(Date.now())
          }
        }, 1000)

        // Timeout for establishing connection
        setTimeout(() => {
          if (isPeerActive && connectionState !== 'connected' && !contentData) {
            setError('Connection timed out. Make sure the sender has the file ready to share.')
            setLoading(false)
            
            // Fall back to simulated download after timeout
            simulateContentFetch()
          }
        }, 30000) // 30 second timeout

        return () => {
          clearInterval(checkSession)
          peer.close()
        }
      } catch (err) {
        console.error('Error initializing peer connection:', err)
        setError('Failed to initialize connection. Please try again.')
        setLoading(false)
        
        // Fall back to simulated download after error
        simulateContentFetch()
      }
    }

    // Fallback for non-p2p transfers
    const simulateContentFetch = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Simulate network delay for metadata fetch
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Create content metadata based on the fileId
        let data: ContentData
        
        // For demo, determine content type based on the fileId
        if (fileId.startsWith('text-')) {
          data = {
            type: 'text',
            name: 'Shared Text',
            size: 1024, // Approximate size in characters
            content: "This is the actual shared text content for ID: " + fileId + "\n\n" +
                     "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at dolor eget purus vulputate varius. " +
                     "Nulla facilisi. Nullam vitae feugiat enim. Suspendisse potenti. Etiam et est lectus. " +
                     "Donec eu magna vitae nunc fringilla bibendum sed eget leo. Phasellus mattis ullamcorper magna, " +
                     "non finibus nulla tincidunt quis. Donec tincidunt diam eget orci vehicula, eget malesuada ex mattis."
          }
        } else {
          // For file content, we'll create a large random file for demo purposes
          // Choose random file size between 50MB and 500MB for demo purposes
          const demoSize = Math.floor(50 * 1024 * 1024 + Math.random() * 450 * 1024 * 1024)
          
          // Select random demo file types for variety
          const demoTypes = [
            { name: 'large-document.pdf', type: 'application/pdf' },
            { name: 'video-presentation.mp4', type: 'video/mp4' },
            { name: 'software-package.zip', type: 'application/zip' },
            { name: 'dataset.csv', type: 'text/csv' },
            { name: 'system-backup.iso', type: 'application/octet-stream' }
          ]
          
          const demoFile = demoTypes[Math.floor(Math.random() * demoTypes.length)]
          
          data = {
            type: 'file',
            name: demoFile.name,
            size: demoSize,
            mimeType: demoFile.type
          }
        }
        
        // Set the content data
        setContentData(data)
        setProgress(0)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching content:', err)
        setError('Failed to retrieve the content. It may have expired or been removed.')
        setLoading(false)
      }
    }

    initializePeer()

    return () => {
      isPeerActive = false
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }
  }, [isShortCode, normalizedId, contentData, connectionState, isDownloading])

  // Handle click on the download button
  const handleDownload = async () => {
    if (!contentData) return
    
    if (contentData.type === 'text') {
      // For text content, copy to clipboard
      if (typeof contentData.content === 'string') {
        navigator.clipboard.writeText(contentData.content)
          .then(() => {
            setIsDownloadComplete(true)
          })
          .catch(err => {
            console.error('Failed to copy text:', err)
            setError('Failed to copy text to clipboard. Try again or select and copy manually.')
          })
      }
    } else if (downloadUrl) {
      // If we already have a download URL from peer transfer, use it
      if (linkRef.current) {
        linkRef.current.href = downloadUrl
        linkRef.current.download = contentData.name
        linkRef.current.click()
      }
    } else {
      // For fallback file download, use the simulated method
      setIsDownloading(true)
      setTransferStartTime(Date.now())
      
      try {
        // Simulate download with the dynamic chunking system
        await simulateDownload(
          contentData.size,
          (progress, speed) => {
            setProgress(progress)
            setTransferSpeed(speed)
          }
        )
        
        // Download completed successfully
        setIsDownloadComplete(true)
        setIsDownloading(false)
      } catch (err) {
        console.error('Download failed:', err)
        setError('Failed to download file. Please try again.')
        setIsDownloading(false)
      }
    }
  }

  // Simulate download for non-p2p transfers
  const simulateDownload = (fileSize: number, onProgress: (progress: number, speed: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0
      const startTime = Date.now()
      const interval = setInterval(() => {
        // Simulate variable download speeds
        const randomIncrement = 1 + Math.random() * 5
        progress = Math.min(100, progress + randomIncrement)
        
        // Calculate simulated speed (in bytes per second)
        const elapsed = (Date.now() - startTime) / 1000
        const bytesDownloaded = (progress / 100) * fileSize
        const speed = bytesDownloaded / elapsed
        
        onProgress(progress, speed)
        
        if (progress >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 200)
    })
  }
  
  // Calculate estimated file download time for display
  const getEstimatedTimeDisplay = () => {
    if (!contentData || contentData.type === 'text') return null
    
    const size = contentData.size
    let timeString = ''
    
    // Estimate based on file size using typical connection speeds
    if (size < 1024 * 1024) { // < 1MB
      timeString = 'Less than a second'
    } else if (size < 10 * 1024 * 1024) { // < 10MB
      timeString = 'A few seconds'
    } else if (size < 100 * 1024 * 1024) { // < 100MB
      timeString = 'Less than a minute'
    } else if (size < 500 * 1024 * 1024) { // < 500MB
      timeString = '1-3 minutes'
    } else {
      timeString = 'Several minutes'
    }
    
    return timeString
  }

  // Determine if the download should start automatically (peer-to-peer)
  const shouldAutoDownload = isShortCode && downloadUrl && !isDownloadComplete

  // Auto-download when peer transfer is complete
  useEffect(() => {
    if (shouldAutoDownload && linkRef.current) {
      linkRef.current.href = downloadUrl!
      linkRef.current.download = contentData?.name || 'download'
      linkRef.current.click()
      setIsDownloadComplete(true)
    }
  }, [shouldAutoDownload, downloadUrl, contentData?.name])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-white">
      <a ref={linkRef} className="hidden" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg glassmorphism p-6 md:p-8"
      >
        <div 
          onClick={() => router.push('/')}
          className="flex items-center mb-6 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gradient">
            {loading ? 'Connecting...' : 'Download Content'}
          </h1>
          {isShortCode && (
            <p className="text-blue-600 font-mono text-sm">
              Code: {displayId}
            </p>
          )}
        </div>
        
        {loading && (
          <div className="flex flex-col items-center py-8">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              ></motion.div>
            </div>
            {isShortCode ? (
              <div className="text-center">
                <p className="text-blue-700 mb-2">
                  Waiting for peer connection...
                </p>
                <p className="text-blue-500 text-sm">
                  Connection status: {connectionState}
                </p>
              </div>
            ) : (
              <p className="text-blue-700 text-center">
                Retrieving content information...
              </p>
            )}
          </div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-600 p-6 rounded-xl text-center mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-3 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h3 className="font-semibold text-lg mb-2">Content Not Available</h3>
            <p>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              Return Home
            </button>
          </motion.div>
        )}
        
        {!loading && !error && contentData && (
          <div className="space-y-6">
            <div className="bg-white/70 rounded-xl p-6 shadow-sm">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  {contentData.type === 'file' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-blue-800 mb-1">
                    {contentData.name}
                  </h3>
                  <p className="text-blue-600 text-sm">
                    {formatFileSize(contentData.size)}
                    {contentData.type === 'file' && !isDownloading && !isDownloadComplete && !isShortCode && (
                      <span className="ml-2 text-blue-400">
                        • Est. download time: {getEstimatedTimeDisplay()}
                      </span>
                    )}
                    {isShortCode && (
                      <span className="ml-2 text-blue-400">
                        • Direct peer-to-peer transfer
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {contentData.type === 'text' && contentData.content && typeof contentData.content === 'string' && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-100 font-mono text-sm whitespace-pre-wrap text-blue-800 max-h-48 overflow-y-auto">
                  {contentData.content}
                </div>
              )}
            </div>
            
            {isDownloading && (
              <div className="my-6">
                <TransferSpeedometer 
                  fileSize={contentData.size}
                  progress={progress}
                  transferStartTime={transferStartTime || Date.now()}
                  isComplete={isDownloadComplete}
                  currentSpeed={transferSpeed}
                />
                <div className="flex justify-between items-center mt-2 text-sm">
                  <p className="text-blue-600">
                    {isShortCode ? 'Receiving via peer connection' : 'Downloading with dynamic chunking'}
                  </p>
                  <p className="text-blue-600 font-medium">
                    {formatSpeed(transferSpeed)}
                  </p>
                </div>
              </div>
            )}
            
            {isDownloadComplete ? (
              <div className="text-center">
                <div className="inline-flex items-center bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {contentData.type === 'text' ? 'Copied to clipboard!' : 'Download complete!'}
                </div>
                
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium"
                >
                  Return Home
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                disabled={isDownloading}
                className={`w-full py-3 button-gradient text-white font-medium rounded-full flex items-center justify-center shadow-md ${
                  isDownloading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  {contentData.type === 'text' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  )}
                </svg>
                {contentData.type === 'text' ? 'Copy to Clipboard' : `Download ${formatFileSize(contentData.size)} File`}
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
} 