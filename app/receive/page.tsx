'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'

export default function ReceivePage() {
  const [fileId, setFileId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fileId.trim()) {
      setError('Please enter a file ID')
      return
    }

    // Navigate to the download page with the file ID
    router.push(`/download/${fileId.trim()}`)
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Header />
      
      <motion.div 
        className="w-full max-w-4xl p-8 my-12 glassmorphism"
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Receive File
          </h1>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 text-center">
            Enter the file ID provided by the sender to download your file
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fileId" className="block text-sm font-medium text-gray-700 mb-1">
              File ID
            </label>
            <input
              type="text"
              id="fileId"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              className="input-field"
              placeholder="Enter the file ID"
            />
          </div>

          {error && (
            <motion.p 
              className="text-sm text-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download File
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Don't have a file ID? Ask the sender to share it with you
          </p>
        </div>
      </motion.div>

      <footer className="w-full py-6 text-center text-gray-600">
        <p>© {new Date().getFullYear()} Meow Share. Made with ❤️ by Dheeraj</p>
      </footer>
    </div>
  )
} 