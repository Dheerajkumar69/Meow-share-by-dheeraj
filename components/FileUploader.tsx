'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'

interface FileUploaderProps {
  onFileUpload: (file: File, id: string) => void
}

const FileUploader = ({ onFileUpload }: FileUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setError('No file selected')
      return
    }

    setError(null)
    setIsLoading(true)
    
    const file = acceptedFiles[0]
    
    // Simulate upload processing with a slight delay
    setTimeout(() => {
      // Generate a unique ID for this file
      const fileId = uuidv4()
      
      // Call the callback with the file and its ID
      onFileUpload(file, fileId)
      setIsLoading(false)
    }, 1500)
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false
  })

  return (
    <div className="flex flex-col items-center w-full">
      <motion.div 
        className="w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          {...getRootProps()} 
          className={`flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-xl transition-all duration-200 
            ${isDragActive 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
        >
          <input {...getInputProps()} />
          
          <motion.div
            className="flex items-center justify-center w-20 h-20 mb-4 text-white bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
            animate={{ 
              scale: isDragActive ? [1, 1.1, 1] : 1,
            }}
            transition={{ 
              duration: 0.5, 
              repeat: isDragActive ? Infinity : 0,
              repeatType: "reverse" 
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-10 h-10"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" 
              />
            </svg>
          </motion.div>
          
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-primary-500 border-r-transparent border-b-secondary-500 border-l-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-lg font-medium text-gray-700">Processing file...</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-2 text-lg font-medium text-gray-700">
                {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
              </p>
              <p className="text-sm text-gray-500">or click to select a file</p>
              <p className="mt-4 text-sm text-gray-400">
                Support for any file type • Unlimited size
              </p>
            </div>
          )}
        </div>
      </motion.div>
      
      {error && (
        <motion.p 
          className="mt-4 text-sm text-red-500"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

export default FileUploader 