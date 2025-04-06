'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface FileUploaderProps {
  onFileChange: (file: File) => void
}

export default function FileUploader({ onFileChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      validateAndUploadFile(file)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      validateAndUploadFile(file)
    }
  }

  const validateAndUploadFile = (file: File) => {
    setError(null)
    
    if (file.size > 100 * 1024 * 1024) {
      setError("File size exceeds 100MB limit")
      return
    }
    
    onFileChange(file)
  }

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl transition-all ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-gray-600 hover:border-primary/50 hover:bg-primary/5"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="animate-float"
        >
          <svg
            className="w-16 h-16 mb-4 text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12"
            />
          </svg>
        </motion.div>

        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-200 mb-2">
            Drag & Drop File
          </h3>
          <p className="text-gray-400 mb-4">or</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={openFileDialog}
            className="button-gradient text-white font-medium py-2 px-6 rounded-full shadow-lg"
          >
            Browse Files
          </motion.button>
          <p className="mt-3 text-sm text-gray-400">Maximum file size: 100MB</p>
        </div>
        
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
} 