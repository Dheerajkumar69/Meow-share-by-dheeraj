'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'

export default function DownloadPage() {
  const params = useParams<{ fileId: string }>()
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // In a real application, this would fetch file metadata from your backend
    // For demo purposes, we're just simulating a delay
    const fetchFileInfo = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // For demo, return dummy data
        setFileName("Sample File.pdf")
        setFileSize("2.4 MB")
        setLoading(false)
      } catch (err) {
        setError("File not found or has expired")
        setLoading(false)
      }
    }
    
    fetchFileInfo()
  }, [params.fileId])

  const handleDownload = () => {
    // In a real app, this would trigger the actual download from your storage service
    // For demo purposes, we're just showing the UI
    alert(`Starting download for file ID: ${params.fileId}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <motion.div 
        className="w-full max-w-md p-6 glassmorphism"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 mr-4 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-6 h-6 text-white"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            ShareDrop
          </h1>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-t-primary-500 border-r-transparent border-b-secondary-500 border-l-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading file information...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center w-16 h-16 mb-4 text-red-500 bg-red-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800 text-center">File Not Available</h2>
            <p className="text-sm text-gray-600 text-center">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4 text-primary-500 bg-primary-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            
            <h2 className="mb-2 text-xl font-semibold text-gray-800 text-center">File Ready to Download</h2>
            
            <div className="w-full mt-4 p-4 bg-white/70 rounded-lg">
              <div className="flex flex-col items-center">
                <p className="text-lg font-medium text-gray-800 mb-1">{fileName}</p>
                <span className="px-3 py-1 mb-4 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
                  {fileSize}
                </span>
                
                <button 
                  onClick={handleDownload}
                  className="w-full py-3 btn-primary flex justify-center items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download File
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      
      <footer className="mt-8 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} ShareDrop. All rights reserved.</p>
      </footer>
    </div>
  )
} 