'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRScanner from '../../components/QRScanner'
import { normalizeShortCode, validateShortCode, formatShortCode } from '../../utils/codeGenerator'

export default function ReceivePage() {
  const router = useRouter()
  const [fileId, setFileId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [isFormattedInput, setIsFormattedInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Remove any formatting like dashes and convert to uppercase
    const normalizedFileId = normalizeShortCode(fileId)
    
    if (!normalizedFileId) {
      setError('Please enter a valid share code or ID')
      return
    }
    
    // Redirects:
    // 1. If it's a valid 6-character hex code (our short code system)
    // 2. If it's longer, assume it's a UUID or other valid identifier
    if (validateShortCode(normalizedFileId) || normalizedFileId.length > 6) {
      router.push(`/download/${normalizedFileId}`)
    } else {
      setError('Invalid share code format')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setFileId(input)
    
    // If the input is exactly 6 hex chars, or follows the XXX-YYY pattern,
    // offer to format it nicely as the user types
    const normalizedInput = normalizeShortCode(input)
    setIsFormattedInput(validateShortCode(normalizedInput))
    
    // Clear any previous errors when the user types
    if (error) setError(null)
  }

  const formatInput = () => {
    const normalizedInput = normalizeShortCode(fileId)
    if (validateShortCode(normalizedInput)) {
      setFileId(formatShortCode(normalizedInput))
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glassmorphism rounded-2xl p-6 md:p-8"
        >
          <Link 
            href="/"
            className="inline-flex items-center mb-8 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gradient">Receive Files</h1>
            <p className="text-blue-700">Enter a share code or scan a QR code to receive shared content</p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="space-y-2">
              <label htmlFor="fileId" className="text-blue-800 font-medium">Share Code or ID</label>
              <div className="relative">
                <input
                  type="text"
                  id="fileId"
                  value={fileId}
                  onChange={handleInputChange}
                  onBlur={formatInput}
                  placeholder="Enter code (e.g. ABC-123)"
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 transition-all"
                />
                
                {isFormattedInput && !fileId.includes('-') && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    type="button"
                    onClick={formatInput}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full"
                  >
                    Format
                  </motion.button>
                )}
              </div>
              
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm"
                >
                  {error}
                </motion.p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="flex-1 button-gradient text-white font-medium py-3 px-6 rounded-full shadow-md"
              >
                Access Content
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex-1 bg-blue-100 text-blue-700 font-medium py-3 px-6 rounded-full hover:bg-blue-200 transition-colors duration-300 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
                Scan QR Code
              </motion.button>
            </div>
          </form>
          
          <div className="mt-10 flex flex-col items-center">
            <div className="flex flex-col items-center bg-blue-50 rounded-xl p-6 w-full max-w-sm border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-blue-800 mb-2">How to Receive</h2>
              <ul className="text-blue-700 text-sm space-y-2 list-disc pl-5">
                <li>Ask the sender for the 6-digit share code</li>
                <li>Enter the code above (with or without dash)</li>
                <li>Or scan the QR code they shared with you</li>
                <li>Access and download the shared content</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {showScanner && (
          <QRScanner onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>
    </div>
  )
} 