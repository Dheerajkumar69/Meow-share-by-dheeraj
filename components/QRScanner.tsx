'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import jsQR from 'jsqr';

export interface QRScannerProps {
  onClose: () => void;
  onScan?: (result: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [permission, setPermission] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Handle camera initialization
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setPermission(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Camera access denied. Please allow camera access and try again.');
      }
    };
    
    startCamera();
    
    // Clean up on unmount
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Handle QR code scanning
  useEffect(() => {
    if (!permission) return;
    
    const interval = setInterval(() => {
      if (!scanning) return;
      
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      
      if (!videoElement || !canvasElement) return;
      
      const canvasContext = canvasElement.getContext('2d');
      if (!canvasContext) return;
      
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // Set canvas dimensions to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Draw video frame to canvas
        canvasContext.drawImage(
          videoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        
        // TODO: Replace with actual QR code scanning library like jsQR
        // For demo, we'll simulate a QR code detection after 5 seconds
        setTimeout(() => {
          const mockQRCode = "ABC123";
          setScanning(false);
          if (onScan) {
            onScan(mockQRCode);
          } else {
            alert(`QR Code detected: ${mockQRCode}`);
          }
        }, 5000);
        
        // Clear the interval after simulation
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [permission, scanning, onScan]);
  
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-full max-w-lg mx-auto">
        {error ? (
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-red-600 text-xl mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-lg aspect-square">
              {/* Camera feed */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Canvas for processing video frames */}
              <canvas 
                ref={canvasRef} 
                className="hidden"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              </div>
              
              {/* Scanning animation */}
              <motion.div 
                className="absolute left-0 right-0 h-1 bg-blue-500"
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "linear" 
                }}
              />
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-white mb-4">Position the QR code within the frame</p>
              <button 
                onClick={onClose}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default QRScanner; 