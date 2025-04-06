'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface TransferSpeedometerProps {
  fileSize: number; // in bytes
  progress: number; // 0-100
  transferStartTime?: number; // timestamp when transfer started
  isComplete?: boolean;
}

export default function TransferSpeedometer({
  fileSize,
  progress,
  transferStartTime,
  isComplete = false
}: TransferSpeedometerProps) {
  const [speed, setSpeed] = useState<number>(0); // Speed in bytes per second
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const prevProgressRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(Date.now());
  const animationRef = useRef<number>();
  
  // Format bytes to a readable string (KB, MB, etc.)
  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };
  
  // Format speed (bytes/second) to a readable string
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };
  
  // Format seconds to a readable time string
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.ceil(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  // Calculate the angle for the speedometer needle
  const calculateNeedleAngle = (speed: number): number => {
    // Map the speed to an angle between -120 and 120 degrees
    // We're using a logarithmic scale to handle wide range of speeds
    // This is a simplified example; adjust the formula based on your needs
    
    // Define the minimum and maximum speeds (bytes/second)
    const minSpeed = 1024; // 1KB/s
    const maxSpeed = 10 * 1024 * 1024; // 10MB/s
    
    if (speed <= 0) return -120; // Minimum angle
    
    // Use logarithmic scale for better visualization
    const logMinSpeed = Math.log(minSpeed);
    const logMaxSpeed = Math.log(maxSpeed);
    const logSpeed = Math.log(Math.max(speed, minSpeed));
    
    // Calculate the position in the range (0-1)
    const position = (logSpeed - logMinSpeed) / (logMaxSpeed - logMinSpeed);
    
    // Map to the angle range (-120 to 120 degrees)
    const angle = -120 + position * 240;
    
    // Clamp the angle between -120 and 120
    return Math.min(Math.max(angle, -120), 120);
  };
  
  useEffect(() => {
    if (isComplete || progress >= 100) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const updateSpeed = (timestamp: number) => {
      // Calculate time elapsed since last update
      const timeElapsed = (timestamp - prevTimestampRef.current) / 1000; // in seconds
      
      // Only update if enough time has passed to get a meaningful measurement
      if (timeElapsed >= 0.5) {
        // Calculate progress change
        const progressChange = progress - prevProgressRef.current;
        
        if (progressChange > 0) {
          // Calculate bytes transferred in this interval
          const bytesTransferred = (progressChange / 100) * fileSize;
          
          // Calculate speed
          const currentSpeed = bytesTransferred / timeElapsed;
          
          // Update speed with some smoothing
          setSpeed(prev => {
            const newSpeed = prev === 0 ? currentSpeed : 0.7 * prev + 0.3 * currentSpeed;
            
            // Calculate time remaining based on latest speed
            const bytesRemaining = fileSize * (1 - progress / 100);
            const secondsRemaining = bytesRemaining / newSpeed;
            setTimeRemaining(secondsRemaining);
            
            return newSpeed;
          });
          
          // Update refs
          prevProgressRef.current = progress;
          prevTimestampRef.current = timestamp;
        }
      }
      
      // Request next frame
      animationRef.current = requestAnimationFrame(updateSpeed);
    };
    
    // Start the animation
    animationRef.current = requestAnimationFrame(updateSpeed);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fileSize, progress, isComplete]);
  
  // Calculate needle angle based on current speed
  const needleAngle = calculateNeedleAngle(speed);
  
  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-xs relative">
        {/* Speedometer Dial */}
        <div className="relative w-full aspect-[2/1]">
          {/* Semicircle Background */}
          <div className="absolute top-0 left-0 w-full h-full flex items-end justify-center overflow-hidden">
            <div className="w-full h-[92%] bg-gradient-to-t from-blue-50 to-blue-100 rounded-t-full relative border-t border-x border-blue-200">
              {/* Speed Markers */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[95%] h-[95%] rounded-t-full">
                  {/* Speed Range Arcs */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden">
                    <div className="absolute bottom-0 left-1/2 w-[95%] h-[190%] -translate-x-1/2 rounded-full border-8 border-blue-200 border-dashed"></div>
                  </div>
                  
                  {/* Slow Range */}
                  <div className="absolute bottom-0 left-[5%] h-1/2 w-[30%] overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-[300%] h-[190%] rounded-full border-8 border-blue-300"></div>
                  </div>
                  
                  {/* Medium Range */}
                  <div className="absolute bottom-0 left-[35%] h-1/2 w-[30%] overflow-hidden">
                    <div className="absolute bottom-0 right-0 left-0 w-[300%] h-[190%] -translate-x-[35%] rounded-full border-8 border-blue-500"></div>
                  </div>
                  
                  {/* Fast Range */}
                  <div className="absolute bottom-0 right-[5%] h-1/2 w-[30%] overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-[300%] h-[190%] rounded-full border-8 border-blue-700"></div>
                  </div>
                </div>
              </div>
              
              {/* Speed Labels */}
              <div className="absolute top-[15%] left-[10%] text-blue-800 text-xs font-semibold">
                Slow
              </div>
              <div className="absolute top-[15%] left-1/2 -translate-x-1/2 text-blue-800 text-xs font-semibold">
                Medium
              </div>
              <div className="absolute top-[15%] right-[10%] text-blue-800 text-xs font-semibold">
                Fast
              </div>
              
              {/* Current Speed Indicator (Needle) */}
              <motion.div 
                className="absolute bottom-0 left-1/2 w-1 h-[45%] bg-red-600 rounded-t-full origin-bottom"
                animate={{ rotate: needleAngle }}
                transition={{ type: "spring", stiffness: 100, damping: 10 }}
                style={{ transformOrigin: 'bottom center' }}
              >
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-600 rounded-full shadow-md"></div>
              </motion.div>
              
              {/* Center Point */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
        
        {/* Speed and Time Readout */}
        <div className="flex flex-col items-center mt-2 gap-2">
          <div className="flex justify-between w-full px-4">
            <div className="text-center">
              <p className="text-xs text-blue-600">Current Speed</p>
              <p className="text-lg font-bold text-blue-800">{formatSpeed(speed)}</p>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-blue-600">Time Remaining</p>
              <p className="text-lg font-bold text-blue-800">
                {timeRemaining === null 
                  ? "Calculating..." 
                  : isComplete 
                  ? "Complete" 
                  : formatTime(timeRemaining)}
              </p>
            </div>
          </div>
          
          {/* Transfer Progress Bar */}
          <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mt-1">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700"
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="w-full flex justify-between text-xs text-blue-600 px-1 mt-1">
            <span>{formatBytes(fileSize * (progress / 100))}</span>
            <span>of {formatBytes(fileSize)}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
} 