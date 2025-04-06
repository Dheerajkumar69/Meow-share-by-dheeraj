'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScanSuccess: (data: string) => void;
  onCancel: () => void;
}

export default function QRScanner({ onScanSuccess, onCancel }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const requestRef = useRef<number>();
  const [hasCamera, setHasCamera] = useState(true);

  // Set up the camera when component mounts
  useEffect(() => {
    async function setupCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // Use back camera on mobile devices
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please check permissions.');
        setHasCamera(false);
      }
    }

    setupCamera();

    // Clean up function to stop camera when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Process video frames for QR code detection
  useEffect(() => {
    if (!hasCamera) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (!videoElement || !canvasElement) return;

    // Wait for video to be ready
    videoElement.onloadedmetadata = () => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      
      // Start scanning
      scanQRCode();
    };

    function scanQRCode() {
      if (!scanning) return;

      const canvasContext = canvasElement.getContext('2d');
      
      if (canvasContext && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // Draw video frame to canvas
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        canvasContext.drawImage(
          videoElement, 
          0, 
          0, 
          canvasElement.width, 
          canvasElement.height
        );
        
        // Get image data from canvas
        const imageData = canvasContext.getImageData(
          0, 
          0, 
          canvasElement.width, 
          canvasElement.height
        );
        
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        // If QR code found
        if (code) {
          console.log('QR code detected:', code.data);
          
          // Draw borders around the QR code
          canvasContext.beginPath();
          canvasContext.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          canvasContext.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          canvasContext.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          canvasContext.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          canvasContext.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          canvasContext.lineWidth = 4;
          canvasContext.strokeStyle = "#3B82F6";
          canvasContext.stroke();
          
          // Stop scanning and call the success callback
          setScanning(false);
          onScanSuccess(code.data);
          return;
        }
      }
      
      // Continue scanning
      requestRef.current = requestAnimationFrame(scanQRCode);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [scanning, hasCamera, onScanSuccess]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="overflow-hidden rounded-xl relative aspect-[4/3] bg-black">
        {/* Video element for camera feed */}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        {/* Canvas for QR processing (hidden) */}
        <canvas 
          ref={canvasRef} 
          className="hidden"
        />
        
        {/* Scanning overlay with animated corners */}
        {scanning && !error && (
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 sm:w-80 sm:h-80 relative">
                {/* Corner markers */}
                <motion.div 
                  className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <motion.div 
                  className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                />
                
                {/* Scan line animation */}
                <motion.div 
                  className="absolute left-0 right-0 h-1 bg-blue-600 z-20"
                  initial={{ top: 0 }}
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-center p-5 bg-white rounded-lg max-w-xs mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-red-500 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Camera Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions and cancel button */}
      <div className="mt-4 text-center">
        <p className="text-blue-800 mb-3">
          Position the QR code within the scanning area
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
        >
          Cancel Scanning
        </button>
      </div>
    </div>
  );
} 