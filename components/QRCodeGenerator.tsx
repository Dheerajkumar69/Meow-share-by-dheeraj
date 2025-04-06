'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'

interface QRCodeGeneratorProps {
  fileId: string
  fileName: string
}

const QRCodeGenerator = ({ fileId, fileName }: QRCodeGeneratorProps) => {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // In a real app, this would be your server URL or cloud function
  const downloadUrl = `${window.location.origin}/download/${fileId}`
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(downloadUrl)
    
    setCopied(true)
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Reset copied state after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <motion.div 
      className="w-full flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="w-full max-w-md p-6 bg-white/50 rounded-xl shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800 text-center">Scan QR Code to Download</h2>
        
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 bg-white rounded-xl shadow-sm">
            <QRCodeSVG 
              value={downloadUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={false}
            />
          </div>
          
          <p className="mt-4 text-sm text-gray-500 text-center">
            Scan this QR code with your mobile device to download the file
          </p>
        </div>
        
        <div className="flex flex-col space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <span className="flex-1 text-sm font-medium text-gray-800 truncate">
              {downloadUrl}
            </span>
            
            <button 
              onClick={copyToClipboard}
              className="ml-2 p-2 text-primary-600 hover:text-primary-800 transition-colors"
              aria-label="Copy link"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              )}
            </button>
          </div>
          
          <a 
            href={downloadUrl}
            download={fileName}
            className="w-full py-3 btn-primary flex justify-center items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Now
          </a>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          This link will expire in 7 days
        </p>
      </div>
    </motion.div>
  )
}

export default QRCodeGenerator 