'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import TransferSpeedometer from '../../../components/TransferSpeedometer'
import { formatShortCode, validateShortCode, mapShortCodeToId } from '../../../utils/codeGenerator'

interface ContentData {
  type: 'file' | 'text'
  name: string
  size: number
  content: string | Blob
}

export default function DownloadPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = Array.isArray(params.fileId) ? params.fileId[0] : params.fileId
  
  const [contentData, setContentData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [transferStartTime, setTransferStartTime] = useState<number | null>(null)
  
  // Check if the fileId is a short code
  const isShortCode = validateShortCode(fileId)
  const displayId = isShortCode ? formatShortCode(fileId) : fileId.slice(0, 8)
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // If using a short code, map it to the real file ID
        const actualFileId = isShortCode 
          ? await mapShortCodeToId(fileId) 
          : fileId
        
        if (!actualFileId) {
          setError('Invalid or expired sharing code')
          setLoading(false)
          return
        }
        
        // Simulate network request delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // For demonstration purposes, we're creating a mock response
        // In a real app, you would make an API call to get the file or text data
        
        const mockResponse: ContentData = {
          type: Math.random() > 0.5 ? 'file' : 'text',
          name: 'Sample Document.pdf',
          size: 5 * 1024 * 1024, // 5MB
          content: 'This is a sample shared text content. In a real application, this would be either the text content or a blob representing the file data.'
        }
        
        setContentData(mockResponse)
      } catch (err) {
        console.error('Error fetching content:', err)
        setError('Failed to fetch content. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [fileId, isShortCode])
  
  const handleDownload = async () => {
    if (!contentData) return
    
    setDownloadStarted(true)
    setTransferStartTime(Date.now())
    
    if (contentData.type === 'text') {
      // For text content, copy to clipboard
      try {
        await navigator.clipboard.writeText(contentData.content as string)
        
        // Simulate progress for text
        const simulateProgress = () => {
          let progress = 0
          const interval = setInterval(() => {
            progress += 5
            setDownloadProgress(progress)
            
            if (progress >= 100) {
              clearInterval(interval)
              setDownloadComplete(true)
            }
          }, 100)
        }
        
        simulateProgress()
      } catch (err) {
        console.error('Failed to copy text:', err)
        setError('Failed to copy text to clipboard.')
      }
    } else {
      // For file download, simulate download progress
      // In a real app, this would be tracking the actual download
      const simulateFileDownload = () => {
        let progress = 0
        const totalTime = 5000 // 5 seconds total download time
        const interval = setInterval(() => {
          progress += 2
          setDownloadProgress(progress)
          
          if (progress >= 100) {
            clearInterval(interval)
            setDownloadComplete(true)
            
            // Create a fake download - in reality this would be the actual file data
            const blob = new Blob(['Fake file content'], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = contentData.name
            document.body.appendChild(a)
            a.click()
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
          }
        }, totalTime / 50) // Update about 50 times during the download
      }
      
      simulateFileDownload()
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 text-white">
          <h1 className="text-2xl font-bold text-center">Download Content</h1>
          <p className="text-center text-blue-100 mt-1">Share code: {displayId}</p>
        </div>
        
        <div className="px-6 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-blue-800 text-lg">Loading shared content...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
                <p>{error}</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="button-gradient text-white font-medium py-2 px-6 rounded-full shadow-md"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {!downloadStarted ? (
                <>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                      {contentData?.type === 'file' ? (
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
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{contentData?.name}</h2>
                      <p className="text-sm text-gray-500">
                        {contentData?.type === 'file' 
                          ? `${(contentData.size / (1024 * 1024)).toFixed(2)} MB` 
                          : `Text Content`}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownload}
                    className="w-full button-gradient py-3 px-4 text-white font-medium rounded-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {contentData?.type === 'file' ? 'Download File' : 'Copy Text'}
                  </motion.button>
                </>
              ) : (
                <>
                  {contentData && (
                    <TransferSpeedometer
                      fileSize={contentData.size}
                      progress={downloadProgress}
                      transferStartTime={transferStartTime || undefined}
                      isComplete={downloadComplete}
                    />
                  )}
                  
                  {downloadComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mt-4"
                    >
                      <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
                        <p>{contentData?.type === 'file' ? 'Download complete!' : 'Text copied to clipboard!'}</p>
                      </div>
                      
                      <button
                        onClick={() => router.push('/')}
                        className="button-gradient text-white font-medium py-2 px-6 rounded-full shadow-md"
                      >
                        Back to Home
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 