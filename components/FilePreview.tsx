'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface FilePreviewProps {
  file: File
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other')
  
  useEffect(() => {
    if (!file) return
    
    // Determine file type
    if (file.type.startsWith('image/')) {
      setFileType('image')
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      setFileType('pdf')
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFileType('other')
      setPreview(null)
    }
    
    return () => {
      // Clean up preview URL
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [file])
  
  const renderFilePreview = () => {
    if (!preview && fileType !== 'other') return null
    
    if (fileType === 'image') {
      return (
        <div className="w-full h-64 relative rounded-lg overflow-hidden mb-4">
          <Image 
            src={preview as string}
            alt={file.name}
            fill
            style={{ objectFit: 'contain' }}
            sizes="(max-width: 768px) 100vw, 500px"
          />
        </div>
      )
    } else if (fileType === 'pdf') {
      return (
        <div className="w-full h-64 border border-gray-200 rounded-lg mb-4 p-2">
          <iframe 
            src={preview as string}
            className="w-full h-full"
            title={file.name}
          />
        </div>
      )
    } else {
      return (
        <div className="w-full rounded-lg bg-gray-100 p-6 mb-4 flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-medium">{file.type || 'Unknown file type'}</p>
          </div>
        </div>
      )
    }
  }

  return (
    <motion.div 
      className="w-full p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full p-6 bg-white rounded-lg shadow-sm mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">File Preview</h2>
        
        {renderFilePreview()}
        
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{file.name}</h3>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default FilePreview 