'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface FilePreviewProps {
  file: File
}

export default function FilePreview({ file }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'other'>('other')
  
  useEffect(() => {
    if (!file) return
    
    // Set file type
    const type = file.type.split('/')[0]
    if (['image'].includes(type)) setFileType('image')
    else if (['video'].includes(type)) setFileType('video')
    else if (['audio'].includes(type)) setFileType('audio')
    else setFileType('other')

    // Create preview for image, video, and audio files
    if (['image', 'video', 'audio'].includes(type)) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      
      // Clean up URL on unmount
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium text-gradient">File Preview</h3>
        <span className="text-sm text-gray-400">{formatSize(file.size)}</span>
      </div>

      <div className="glassmorphism overflow-hidden rounded-xl">
        {/* Preview content based on file type */}
        {fileType === 'image' && preview && (
          <div className="aspect-video flex items-center justify-center overflow-hidden">
            <Image 
              src={preview}
              alt={file.name}
              width={600}
              height={400}
              className="object-contain w-full h-full"
            />
          </div>
        )}

        {fileType === 'video' && preview && (
          <div className="aspect-video flex items-center justify-center">
            <video 
              controls 
              src={preview} 
              className="max-w-full max-h-full"
            />
          </div>
        )}

        {fileType === 'audio' && preview && (
          <div className="py-8 px-4 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-4 animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <audio controls src={preview} className="w-full" />
          </div>
        )}

        {fileType === 'other' && (
          <div className="p-8 flex flex-col items-center">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <FileIcon type={file.type} />
            </div>
            <p className="text-center text-white/80 font-medium">{file.name}</p>
          </div>
        )}
      </div>

      {/* File details */}
      <div className="mt-4 p-4 glassmorphism rounded-xl">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Name:</span>
            <span className="text-white/90 truncate max-w-xs">{file.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="text-white/90">{file.type || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Modified:</span>
            <span className="text-white/90">
              {new Date(file.lastModified).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function FileIcon({ type }: { type: string }) {
  const fileType = type.split('/')[0]
  const fileExtension = type.split('/')[1]
  
  // Different icons based on file type
  if (fileType === 'application' && fileExtension === 'pdf') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-red-400">
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm5.845 17.03a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V12a.75.75 0 00-1.5 0v4.19l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    )
  }
  
  if (fileType === 'application' && (fileExtension === 'doc' || fileExtension === 'docx')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-blue-400">
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm1.125 9.75v1.5c0 .414.336.75.75.75h9a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75h-9a.75.75 0 00-.75.75zm.75 3h9a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-9a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    )
  }
  
  if (fileType === 'application' && ['zip', 'x-zip-compressed', 'x-rar-compressed'].includes(fileExtension)) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-400">
        <path d="M10.5 3.75a6 6 0 00-5.98 6.496A5.25 5.25 0 006.75 20.25H18a4.5 4.5 0 002.206-8.423 3.75 3.75 0 00-4.133-4.303A6.001 6.001 0 0010.5 3.75zm2.25 6a.75.75 0 00-1.5 0v4.94l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V9.75z" />
      </svg>
    )
  }
  
  // Default icon for all other file types
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-secondary">
      <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
      <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
    </svg>
  )
} 