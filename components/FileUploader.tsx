'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { processFileUpload, FILE_CONFIG, formatFileSize } from '../utils/fileHandlers'

export interface FileUploaderProps {
  onFileUpload: (file: File, fileId: string) => void
  uploadProgress?: number
}

export default function FileUploader({ onFileUpload, uploadProgress = 0 }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleSelectedFile(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      handleSelectedFile(file)
    }
  }

  const handleSelectedFile = async (file: File) => {
    setError(null)
    
    // Check file size
    if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
      setError(`File size exceeds the maximum allowed size of 3GB`)
      return
    }
    
    setSelectedFile(file)
    setIsUploading(true)
    setProgress(0)
    
    try {
      // Process the file upload with chunking
      const fileId = await processFileUpload(file, (uploadProgress) => {
        setProgress(uploadProgress)
      })
      
      // Upload complete
      onFileUpload(file, fileId)
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Failed to upload file. Please try again.')
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}
      
      <motion.div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/30' 
            : 'border-blue-200 hover:border-blue-300'
        } ${isUploading ? 'pointer-events-none' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        whileHover={!isUploading ? { scale: 1.01 } : {}}
        whileTap={!isUploading ? { scale: 0.99 } : {}}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-4"
            >
              <div className="w-full max-w-sm mb-6">
                <div className="w-full bg-blue-100 rounded-full h-2.5">
                  <motion.div
                    className="bg-blue-600 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-blue-600">
                  <span>{progress}%</span>
                  <span>
                    {selectedFile && formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
              <p className="text-blue-700">
                Uploading {selectedFile?.name}...
              </p>
              <p className="text-blue-600 text-sm mt-2">
                Processing file in chunks for efficient transfer
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-lg font-medium text-blue-800 mb-2">
                Drag & drop your file here
              </p>
              <p className="text-blue-600 mb-6">
                or click to browse your files
              </p>
              <button className="button-gradient text-white font-medium py-2 px-6 rounded-full shadow-md">
                Select File
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="mt-4 text-center text-sm text-blue-600">
        Max file size: 3GB - Supports any file format
      </div>
    </div>
  )
} 