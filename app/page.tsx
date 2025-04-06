'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileUploader from '../components/FileUploader'
import FilePreview from '../components/FilePreview'
import TextInput from '../components/TextInput'
import TextPreview from '../components/TextPreview'
import QRCodeGenerator from '../components/QRCodeGenerator'
import Link from 'next/link'
import { generateShortCode, formatShortCode } from '../utils/codeGenerator'

export default function Home() {
  const [fileId, setFileId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [shortCode, setShortCode] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareMode, setShareMode] = useState<'file' | 'text'>('file')
  const [sharedText, setSharedText] = useState<string | null>(null)
  const [textId, setTextId] = useState<string | null>(null)
  const [textShortCode, setTextShortCode] = useState<string | null>(null)
  
  // Reset the form state
  const resetUpload = () => {
    setFile(null)
    setFileId(null)
    setShortCode(null)
    setUploadProgress(0)
    setUploadComplete(false)
    setError(null)
    setSharedText(null)
    setTextId(null)
    setTextShortCode(null)
  }
  
  const handleFileChange = useCallback(async (selectedFile: File) => {
    setError(null)
    setFile(selectedFile)
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate a unique ID for the file (in a real app, this would come from the backend)
      const generatedId = `file-${Date.now()}`
      setFileId(generatedId)
      
      // Generate a short code for easier sharing
      const code = generateShortCode()
      setShortCode(formatShortCode(code))
      
      setUploadComplete(true)
    } catch (err) {
      setError('Failed to upload file. Please try again.')
      console.error(err)
    } finally {
      clearInterval(interval)
      setUploadProgress(100)
    }
  }, [])

  const handleTextShare = useCallback(async (text: string) => {
    setError(null)
    setSharedText(text)
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a unique ID for the text (in a real app, this would come from the backend)
      const generatedId = `text-${Date.now()}`
      setTextId(generatedId)
      
      // Generate a short code for easier sharing
      const code = generateShortCode()
      setTextShortCode(formatShortCode(code))
      
      setUploadComplete(true)
    } catch (err) {
      setError('Failed to share text. Please try again.')
      console.error(err)
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 md:p-12 lg:p-24 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-30 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-300 rounded-full opacity-30 blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, 40, 0],
            y: [0, 20, 0],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute -bottom-40 left-1/3 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl"
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
      </div>
      
      <div className="z-10 w-full max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-4 text-gradient"
        >
          Meow Share
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-center mb-12 text-blue-700"
        >
          Instant file & text sharing made simple
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glassmorphism rounded-2xl p-6 md:p-8 w-full max-w-3xl mx-auto"
      >
        {uploadComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl md:text-2xl font-semibold mb-2 text-blue-800">
              {shareMode === 'file' ? 'File Uploaded Successfully!' : 'Text Shared Successfully!'}
            </h2>
            
            <p className="text-blue-600 mb-6 text-center">
              Use the QR code or short code below to share{' '}
              {shareMode === 'file' ? 'this file' : 'your text'}.
            </p>
            
            <div className="bg-blue-50 py-3 px-6 rounded-xl mb-8 flex items-center">
              <div className="font-mono text-blue-800 text-xl mr-4">
                {shareMode === 'file' ? shortCode : textShortCode}
              </div>
              <div className="text-blue-600 text-sm border-l border-blue-200 pl-4">
                Share this 6-digit code
              </div>
            </div>
            
            <div className="mb-8 w-full max-w-md">
              <QRCodeGenerator 
                shareUrl={`${window.location.origin}/download/${shareMode === 'file' 
                  ? shortCode?.replace('-', '') 
                  : textShortCode?.replace('-', '')
                }`} 
              />
            </div>
            
            {shareMode === 'file' && file && (
              <div className="w-full mb-8">
                <FilePreview file={file} />
              </div>
            )}
            
            {shareMode === 'text' && sharedText && (
              <div className="w-full mb-8">
                <TextPreview text={sharedText} />
              </div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetUpload}
              className="mt-4 bg-blue-100 text-blue-700 font-medium py-3 px-6 rounded-full hover:bg-blue-200 transition-colors duration-300"
            >
              Share Another {shareMode === 'file' ? 'File' : 'Text'}
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setShareMode('file')}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  shareMode === 'file'
                    ? 'button-gradient text-white glow'
                    : 'bg-muted text-blue-600 hover:bg-blue-50'
                }`}
              >
                Share File
              </button>
              <button
                onClick={() => setShareMode('text')}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  shareMode === 'text'
                    ? 'button-gradient text-white glow'
                    : 'bg-muted text-blue-600 hover:bg-blue-50'
                }`}
              >
                Share Text
              </button>
            </div>

            <AnimatePresence mode="wait">
              {shareMode === 'file' ? (
                <motion.div
                  key="file-uploader"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <FileUploader 
                    onFileUpload={handleFileChange} 
                    uploadProgress={uploadProgress}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="text-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextInput onTextSubmit={handleTextShare} />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-blue-600 mb-2">Want to receive something?</p>
              <Link 
                href="/receive" 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary hover:text-blue-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Go to Receive Page
              </Link>
            </div>
          </>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-50 text-red-500 rounded-lg text-center"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="mt-auto pt-12 w-full text-center text-sm text-blue-600"
      >
        <p>© 2024 Meow Share. Made with 😺 by Dheeraj</p>
      </motion.footer>
    </main>
  )
} 