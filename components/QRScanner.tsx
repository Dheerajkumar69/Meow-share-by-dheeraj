'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';

export default function QRScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        const constraints = { video: { facingMode: 'environment' } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // required for iOS
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setCameraError('Unable to access camera. Please check permissions.');
      }
    };

    startCamera();
    
    return () => {
      // Stop all camera streams when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;
    
    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Only scan if video is actually playing
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for QR code scanning
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR library to detect QR codes in the image
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          // QR code found
          setScanning(false);
          
          // Navigate to the detected URL or code
          try {
            // Check if it's a URL
            new URL(code.data);
            router.push(code.data);
          } catch (e) {
            // Not a URL, treat as a code
            router.push(`/download/${code.data}`);
          }
        }
      } catch (err) {
        console.error('Error scanning QR code:', err);
      }
    };
    
    // Start scanning at intervals
    scanIntervalRef.current = setInterval(scanQRCode, 200);
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [scanning, router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold">Scan QR Code</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative aspect-square w-full bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <p className="text-white bg-red-500 rounded-lg p-4">
                {cameraError}
              </p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay 
                playsInline 
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning overlay with transparent window */}
              <div className="absolute inset-0 p-6">
                <div className="relative w-full h-full border-2 border-white/50 rounded-lg">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-md" />
                  
                  {/* Scanning animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                      initial={{ y: 0 }}
                      animate={{ y: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-full h-1 bg-blue-500/70"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 text-center bg-gray-50">
          {scanning ? (
            <p className="text-gray-600 mb-2">Position QR code within the frame to scan</p>
          ) : (
            <p className="text-green-600 mb-2">QR code detected! Redirecting...</p>
          )}
          
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium mt-2"
          >
            Cancel Scan
          </button>
        </div>
      </div>
    </motion.div>
  );
} 