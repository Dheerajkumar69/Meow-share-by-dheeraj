'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import FileUploader from '../components/FileUploader'
import FilePreview from '../components/FilePreview'
import TextInput from '../components/TextInput'
import TextPreview from '../components/TextPreview'
import QRCodeGenerator from '../components/QRCodeGenerator'
import Header from '../components/Header'
import Link from 'next/link'

export default function Home() {
  const [fileId, setFileId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [sharedText, setSharedText] = useState<string | null>(null)
  const [textId, setTextId] = useState<string | null>(null)
  const [shareMode, setShareMode] = useState<'file' | 'text'>('file')
  
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile)
    setUploadState('uploading')
    
    // Simulate upload delay
    setTimeout(() => {
      const newId = uuidv4()
      setFileId(newId)
      setUploadState('success')
    }, 1500)
  }

  const handleTextShare = (text: string) => {
    setSharedText(text)
    setUploadState('uploading')
    
    // Simulate processing delay
    setTimeout(() => {
      const newId = uuidv4()
      setTextId(newId)
      setUploadState('success')
    }, 1000)
  }
  
  const resetUpload = () => {
    setFile(null)
    setFileId(null)
    setSharedText(null)
    setTextId(null)
    setUploadState('idle')
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
        {uploadState === 'idle' && (
          <div className="flex flex-col items-center">
            <div className="flex space-x-4 mb-8">
              <button
                onClick={() => setShareMode('file')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  shareMode === 'file'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Share File
              </button>
              <button
                onClick={() => setShareMode('text')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  shareMode === 'text'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Share Text
              </button>
            </div>

            {shareMode === 'file' ? (
              <FileUploader onFileChange={handleFileChange} />
            ) : (
              <TextInput onTextShare={handleTextShare} />
            )}
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-2">Want to receive something?</p>
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
        )}

        {uploadState === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-primary rounded-full border-t-transparent mb-4"
            />
            <p className="text-lg text-gray-300">
              {shareMode === 'file' ? 'Uploading file...' : 'Processing text...'}
            </p>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="flex flex-col items-center">
            {shareMode === 'file' && file && (
              <>
                <FilePreview file={file} />
                <div className="border-t border-white/10 pt-6 mt-2"></div>
              </>
            )}

            {shareMode === 'text' && sharedText && (
              <>
                <TextPreview text={sharedText} />
                <div className="border-t border-white/10 pt-6 mt-2"></div>
              </>
            )}
            
            {(fileId || textId) && (
              <QRCodeGenerator 
                shareUrl={`${window.location.origin}/download/${shareMode === 'file' ? fileId : textId}`} 
              />
            )}
            
            <button 
              onClick={resetUpload}
              className="mt-8 btn-primary"
            >
              Share Something Else
            </button>
          </div>
        )}
      </motion.div>
      
      <footer className="w-full py-6 text-center text-gray-600">
        <p>© {new Date().getFullYear()} Meow Share. Made with ❤️ by Dheeraj</p>
      </footer>
    </div>
  )
} 