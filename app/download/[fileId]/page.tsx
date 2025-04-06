'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import Header from '../../../components/Header'

interface ContentData {
  type: 'file' | 'text'
  name: string
  size?: string
  content?: string
}

export default function DownloadPage() {
  const params = useParams<{ fileId: string }>()
  const [contentData, setContentData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // For demo, return dummy data
        // In a real app, this would fetch from your backend
        setContentData({
          type: 'text',
          name: 'Shared Text',
          content: 'This is a sample shared text. In a real application, this would be fetched from your backend.'
        })
        setLoading(false)
      } catch (_error) {
        setError("Content not found or has expired")
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [params.fileId])

  const handleDownload = () => {
    if (!contentData) return

    if (contentData.type === 'text' && contentData.content) {
      navigator.clipboard.writeText(contentData.content)
      alert('Text copied to clipboard!')
    } else {
      // In a real app, this would trigger the actual file download
      alert(`Starting download for ID: ${params.fileId}`)
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Header />
      
      <motion.div 
        className="w-full max-w-md p-6 my-12 glassmorphism"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 mr-4 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
            {contentData?.type === 'text' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Meow Share
          </h1>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-t-primary-500 border-r-transparent border-b-secondary-500 border-l-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Loading content information...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center w-16 h-16 mb-4 text-red-500 bg-red-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800 text-center">Content Not Available</h2>
            <p className="text-sm text-gray-600 text-center">{error}</p>
          </div>
        ) : contentData && (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 mb-4 text-primary-500 bg-primary-100 rounded-full">
              {contentData.type === 'text' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
            </div>
            
            <h2 className="mb-2 text-xl font-semibold text-gray-800 text-center">
              {contentData.type === 'text' ? 'Text Ready to Copy' : 'File Ready to Download'}
            </h2>
            
            <div className="w-full mt-4 p-4 bg-white/70 rounded-lg">
              <div className="flex flex-col items-center">
                <p className="text-lg font-medium text-gray-800 mb-1">{contentData.name}</p>
                {contentData.size && (
                  <span className="px-3 py-1 mb-4 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
                    {contentData.size}
                  </span>
                )}

                {contentData.type === 'text' && contentData.content && (
                  <div className="w-full p-4 mb-4 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap break-words text-gray-700 font-mono text-sm">
                      {contentData.content}
                    </pre>
                  </div>
                )}
                
                <button 
                  onClick={handleDownload}
                  className="w-full py-3 btn-primary flex justify-center items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    {contentData.type === 'text' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    )}
                  </svg>
                  {contentData.type === 'text' ? 'Copy Text' : 'Download File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      
      <footer className="w-full py-6 text-center text-gray-600">
        <p>© {new Date().getFullYear()} Meow Share. Made with ❤️ by Dheeraj</p>
      </footer>
    </div>
  )
} 