'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import FilePreview from '../../components/FilePreview';
import TransferSpeedometer from '../../components/TransferSpeedometer';
import { generateShortCode, formatShortCode } from '../../utils/codeGenerator';
import { processFileUpload, formatFileSize, formatSpeed } from '../../utils/fileHandlers';

export default function SharePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('file');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to handle text changes
  useEffect(() => {
    if (text.trim() !== '') {
      setActiveTab('text');
    }
  }, [text]);

  // Effect to handle file selection
  useEffect(() => {
    if (file) {
      setActiveTab('file');
    }
  }, [file]);

  // Handle file selection through the file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handle drag events for the drop zone
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Handle content sharing
  const handleShare = async () => {
    let id = '';
    const code = generateShortCode();
    
    // Start the upload process
    setIsUploading(true);
    setShortCode(code);
    setUploadProgress(0);
    setUploadStartTime(Date.now());
    
    try {
      if (activeTab === 'text' && text.trim()) {
        // For text content, we'll just simulate a short delay and set as complete
        await new Promise(resolve => setTimeout(resolve, 500));
        id = `text-${code}`;
        setUploadProgress(100);
        setIsUploadComplete(true);
        
      } else if (activeTab === 'file' && file) {
        // For file upload, use our chunked upload system
        id = `file-${code}`;
        
        // Use the enhanced file upload process with dynamic chunking
        await processFileUpload(
          file,
          (progress: number, speed: number) => {
            setUploadProgress(progress);
            setUploadSpeed(speed);
          }
        );
        
        setIsUploadComplete(true);
      }
      
      // Generate the share URL using the window.location.origin
      const origin = window.location.origin;
      const url = `${origin}/download/${id}`;
      setShareUrl(url);
      
    } catch (error) {
      console.error('Error during upload:', error);
      alert('Failed to upload content. Please try again later.');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg glassmorphism p-6 md:p-8 mb-8"
      >
        <div 
          onClick={() => router.push('/')}
          className="flex items-center mb-6 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gradient">
          Share Content
        </h1>

        {/* Tab Selector */}
        {!shareUrl && (
          <div className="flex border-b border-blue-100 mb-6">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-3 font-medium text-sm md:text-base transition-colors ${
                activeTab === 'file'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-blue-400 hover:text-blue-500'
              }`}
            >
              Share a File
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 font-medium text-sm md:text-base transition-colors ${
                activeTab === 'text'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-blue-400 hover:text-blue-500'
              }`}
            >
              Share Text
            </button>
          </div>
        )}

        {/* Content Container */}
        {!shareUrl ? (
          <>
            {/* File Upload Area */}
            {activeTab === 'file' && (
              <div 
                className={`${
                  file ? 'border-none p-0' : 'border-2 border-dashed p-8'
                } ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'
                } rounded-xl flex flex-col items-center justify-center transition-all mb-6`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <FilePreview file={file} />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-lg text-blue-800 mb-2">
                      Drop your file here
                    </h3>
                    <p className="text-blue-600 mb-4">
                      or browse from your device
                    </p>
                    <button
                      onClick={handleBrowseClick}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      Browse Files
                    </button>
                    <p className="mt-4 text-sm text-blue-400">
                      Maximum file size: 3GB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Text Input Area */}
            {activeTab === 'text' && (
              <div className="mb-6">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type or paste the text you want to share..."
                  className="w-full h-48 p-4 bg-white/50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-blue-900 placeholder-blue-300 resize-none"
                />
              </div>
            )}

            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              disabled={
                (activeTab === 'text' && text.trim() === '') ||
                (activeTab === 'file' && !file) ||
                isUploading
              }
              className={`w-full py-3 button-gradient text-white font-medium rounded-full flex items-center justify-center shadow-md ${
                (activeTab === 'text' && text.trim() === '') ||
                (activeTab === 'file' && !file) ||
                isUploading
                  ? 'opacity-70 cursor-not-allowed'
                  : ''
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 0m-3.935 0l-9.566-5.314m9.566-4.064a2.25 2.25 0 00-3.935 0" />
              </svg>
              {isUploading ? 'Processing...' : 'Share Content'}
            </motion.button>
          </>
        ) : (
          <>
            {/* Content Shared Success View */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                Content Ready to Share!
              </h2>
              <p className="text-blue-600">
                {activeTab === 'text' ? 'Your text' : 'Your file'} has been uploaded and is ready to share using the QR code or link below.
              </p>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-700 mb-1">Short Code:</p>
                <div className="font-mono text-xl text-blue-800 tracking-wider">
                  {shortCode && formatShortCode(shortCode)}
                </div>
                <p className="text-xs text-blue-500 mt-1">
                  Share this code for easy access
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="mb-6">
              <QRCodeGenerator shareUrl={shareUrl} />
            </div>

            {/* Share Again Button */}
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShareUrl(null);
                  setShortCode(null);
                  setFile(null);
                  setText('');
                  setUploadProgress(0);
                  setIsUploadComplete(false);
                  setIsUploading(false);
                }}
                className="flex-1 py-3 bg-blue-100 text-blue-700 font-medium rounded-full hover:bg-blue-200 transition-colors"
              >
                Share Something Else
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(shareUrl || '/')}
                className="flex-1 py-3 button-gradient text-white font-medium rounded-full shadow-md"
              >
                View Shared Content
              </motion.button>
            </div>
          </>
        )}
      </motion.div>

      {/* Upload Progress Indicator */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg glassmorphism p-6"
        >
          <h3 className="font-semibold text-blue-800 mb-4">
            {isUploadComplete ? 'Upload Complete!' : 'Uploading Content...'}
          </h3>
          
          <TransferSpeedometer
            fileSize={file?.size || (text.length * 2)}
            progress={uploadProgress}
            transferStartTime={uploadStartTime || Date.now()}
            isComplete={isUploadComplete}
            currentSpeed={uploadSpeed}
          />
          
          <div className="flex justify-between items-center mt-2 text-sm">
            <p className="text-blue-600">
              {file ? `Uploading with dynamic chunking` : 'Processing text content'}
            </p>
            <p className="text-blue-600 font-medium">
              {formatSpeed(uploadSpeed)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
} 