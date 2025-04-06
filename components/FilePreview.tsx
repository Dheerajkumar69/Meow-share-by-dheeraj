'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface FilePreviewProps {
  file: File
}

const FilePreview = ({ file }: FilePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string>('unknown')
  const [fileSize, setFileSize] = useState<string>('')

  useEffect(() => {
    // Determine file type category
    const type = file.type.split('/')[0]
    setFileType(type)
    
    // Format file size
    setFileSize(formatFileSize(file.size))
    
    // Generate preview URL for images, videos, and PDFs
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      
      // Clean up object URL when component unmounts
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [file])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        )
      case 'video':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
          </svg>
        )
      case 'audio':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        )
      case 'application':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        )
    }
  }

  return (
    <motion.div 
      className="w-full mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center p-6 bg-white/50 rounded-xl shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-gray-800">File Ready to Share</h2>
        
        <div className="flex flex-col md:flex-row items-center w-full mb-6 p-4 bg-white/70 rounded-lg">
          <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt={file.name} 
                className="object-cover w-full h-full"
              />
            ) : (
              getFileIcon()
            )}
          </div>
          
          <div className="flex-1 ml-0 md:ml-6 mt-4 md:mt-0">
            <h3 className="mb-2 text-lg font-medium text-gray-800 truncate">
              {file.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">
                {file.type || 'Unknown type'}
              </span>
              <span className="px-3 py-1 text-xs font-medium text-secondary-700 bg-secondary-100 rounded-full">
                {fileSize}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Your file is ready to be shared via QR code
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default FilePreview 