'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import FileUploader from '../components/FileUploader'
import FilePreview from '../components/FilePreview'
import QRCodeGenerator from '../components/QRCodeGenerator'
import Header from '../components/Header'
import Link from 'next/link'

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  
  const handleFileUpload = (file: File, id: string) => {
    setUploadedFile(file)
    setFileId(id)
  }
  
  const resetUpload = () => {
    setUploadedFile(null)
    setFileId(null)
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
        {!uploadedFile ? (
          <div className="flex flex-col items-center">
            <FileUploader onFileUpload={handleFileUpload} />
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-2">Want to receive a file?</p>
              <Link 
                href="/receive" 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Go to Receive Page
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FilePreview file={uploadedFile} />
            
            {fileId && (
              <QRCodeGenerator fileId={fileId} fileName={uploadedFile.name} />
            )}
            
            <button 
              onClick={resetUpload}
              className="mt-8 btn-primary"
            >
              Upload Another File
            </button>
          </div>
        )}
      </motion.div>
      
      <footer className="w-full py-6 text-center text-gray-600">
        <p>© {new Date().getFullYear()} ShareDrop. All rights reserved.</p>
      </footer>
    </div>
  )
} 