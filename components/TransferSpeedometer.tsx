'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatFileSize, formatSpeed } from '../utils/fileHandlers';

interface TransferSpeedometerProps {
  fileSize: number;
  progress: number;
  transferStartTime: number;
  isComplete: boolean;
  currentSpeed?: number; // Pass in current speed directly 
}

export default function TransferSpeedometer({
  fileSize,
  progress,
  transferStartTime,
  isComplete,
  currentSpeed = 0
}: TransferSpeedometerProps) {
  const [displayedSpeed, setDisplayedSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const prevProgressRef = useRef(0);
  const prevTimestampRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  
  // Calculate speedometer needle position (0-180 degrees)
  const calculateNeedleAngle = (speed: number): number => {
    // If no speed, return 0
    if (speed <= 0) return 0;
    
    // Use a logarithmic scale for better visualization
    // 1 KB/s = ~10 degrees
    // 10 KB/s = ~30 degrees
    // 100 KB/s = ~60 degrees
    // 1 MB/s = ~90 degrees
    // 10 MB/s = ~120 degrees
    // 100 MB/s = ~150 degrees
    // >1 GB/s = ~180 degrees
    
    // Convert to KB/s for calculation
    const kbps = speed / 1024;
    
    if (kbps <= 0) return 0;
    
    // Log scale formula: angle = 30 * log10(kbps) + 10
    const angle = Math.min(180, 30 * Math.log10(kbps) + 10);
    
    return Math.max(0, angle);
  };
  
  // Format time remaining string
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 0 || !isFinite(seconds)) {
      return 'Calculating...';
    }
    
    if (seconds < 1) {
      return 'Less than a second';
    }
    
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  };

  // Calculate and update speed and time remaining
  useEffect(() => {
    if (isComplete) {
      // If transfer is complete, show the final speed
      setTimeRemaining('Complete');
      return;
    }
    
    const now = Date.now();
    
    // Use provided speed if available, otherwise calculate
    if (currentSpeed > 0) {
      // Update displayed speed with smooth animation
      const updateSpeed = () => {
        setDisplayedSpeed(prev => {
          const diff = currentSpeed - prev;
          // Smooth transition to the new speed value
          return prev + diff * 0.1;
        });
        
        animationRef.current = requestAnimationFrame(updateSpeed);
      };
      
      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(updateSpeed);
      }
      
      // Calculate remaining time based on current speed
      if (progress < 100 && currentSpeed > 0) {
        const bytesRemaining = fileSize * (1 - progress / 100);
        const secondsRemaining = bytesRemaining / currentSpeed;
        setTimeRemaining(formatTimeRemaining(secondsRemaining));
      }
    } else {
      // Fallback to basic calculation if no speed is provided
      const elapsedTime = (now - transferStartTime) / 1000; // seconds
      const bytesTransferred = fileSize * (progress / 100);
      
      if (bytesTransferred > 0 && elapsedTime > 0) {
        const calculatedSpeed = bytesTransferred / elapsedTime;
        setDisplayedSpeed(calculatedSpeed);
        
        if (progress < 100 && calculatedSpeed > 0) {
          const bytesRemaining = fileSize - bytesTransferred;
          const secondsRemaining = bytesRemaining / calculatedSpeed;
          setTimeRemaining(formatTimeRemaining(secondsRemaining));
        }
      }
    }
    
    // Store current values for next calculation
    prevProgressRef.current = progress;
    prevTimestampRef.current = now;
    
    // Cleanup animation frame
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [progress, transferStartTime, fileSize, isComplete, currentSpeed]);

  // Calculate needle angle based on current speed
  const needleAngle = calculateNeedleAngle(displayedSpeed);
  
  // Speed for display, formatted
  const speedFormatted = formatSpeed(displayedSpeed);
  
  // Generate tick marks for the speedometer
  const speedTicks = [
    { label: '0', position: 0 },
    { label: '10KB/s', position: 30 },
    { label: '100KB/s', position: 60 },
    { label: '1MB/s', position: 90 },
    { label: '10MB/s', position: 120 },
    { label: '100MB/s', position: 150 },
    { label: '1GB/s', position: 180 },
  ];
  
  // Color zones for the speedometer arc
  const speedColorZones = [
    { color: '#ef4444', end: 45 },    // Slow (red)
    { color: '#f97316', end: 75 },    // Medium (orange)
    { color: '#eab308', end: 105 },   // Good (yellow)
    { color: '#22c55e', end: 150 },   // Fast (green)
    { color: '#3b82f6', end: 180 },   // Super fast (blue)
  ];

  return (
    <div className="bg-white/80 rounded-lg p-4 shadow-sm">
      <div className="flex flex-col items-center mb-4">
        {/* Speedometer dial */}
        <div className="relative w-full max-w-xs aspect-[2/1] mt-6">
          {/* Speed color zones */}
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <defs>
              {speedColorZones.map((zone, i) => (
                <linearGradient
                  key={`gradient-${i}`}
                  id={`speed-gradient-${i}`}
                  x1="0%" y1="0%" x2="100%" y2="0%"
                >
                  <stop offset="0%" stopColor={i > 0 ? speedColorZones[i-1].color : zone.color} />
                  <stop offset="100%" stopColor={zone.color} />
                </linearGradient>
              ))}
            </defs>
            
            {/* Background arc */}
            <path
              d="M 20 95 A 80 80 0 0 1 180 95"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
              strokeLinecap="round"
            />
            
            {/* Color zone arcs */}
            {speedColorZones.map((zone, i) => {
              const prevPos = i > 0 ? speedColorZones[i-1].end : 0;
              const startAngle = (prevPos * Math.PI) / 180;
              const endAngle = (zone.end * Math.PI) / 180;
              
              // Calculate points on the arc
              const startX = 100 + 80 * Math.sin(startAngle);
              const startY = 95 - 80 * Math.cos(startAngle);
              const endX = 100 + 80 * Math.sin(endAngle);
              const endY = 95 - 80 * Math.cos(endAngle);
              
              // Determine if this is a large arc (> 180 degrees)
              const largeArcFlag = zone.end - prevPos > 180 ? 1 : 0;
              
              return (
                <path
                  key={`arc-${i}`}
                  d={`M ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`}
                  fill="none"
                  stroke={`url(#speed-gradient-${i})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              );
            })}
            
            {/* Tick marks */}
            {speedTicks.map((tick, i) => {
              const angle = (tick.position * Math.PI) / 180;
              const tickLength = i % 2 === 0 ? 10 : 5;
              
              const outerX = 100 + 88 * Math.sin(angle);
              const outerY = 95 - 88 * Math.cos(angle);
              const innerX = 100 + (88 - tickLength) * Math.sin(angle);
              const innerY = 95 - (88 - tickLength) * Math.cos(angle);
              
              const labelX = 100 + 105 * Math.sin(angle);
              const labelY = 95 - 105 * Math.cos(angle);
              
              return (
                <g key={`tick-${i}`}>
                  <line
                    x1={innerX}
                    y1={innerY}
                    x2={outerX}
                    y2={outerY}
                    stroke="#374151"
                    strokeWidth="1.5"
                  />
                  {i % 2 === 0 && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fontSize="7"
                      fill="#4b5563"
                      transform={`rotate(${tick.position}, ${labelX}, ${labelY})`}
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Speedometer needle */}
            <g transform={`rotate(${needleAngle}, 100, 95)`}>
              <circle cx="100" cy="95" r="6" fill="#1f2937" />
              <path
                d="M 100 95 L 100 25"
                stroke="#1f2937"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="100" cy="95" r="3" fill="#ffffff" />
            </g>
            
            {/* Speed display */}
            <text
              x="100"
              y="75"
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#1f2937"
            >
              {speedFormatted}
            </text>
          </svg>
        </div>
        
        {/* Additional info */}
        <div className="flex justify-between w-full mt-2 text-sm">
          <div className="text-blue-800">
            <span className="font-semibold">Size:</span> {formatFileSize(fileSize)}
          </div>
          <div className="text-blue-800">
            <span className="font-semibold">ETA:</span> {timeRemaining || 'Calculating...'}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 10 }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-600">
        <span>{isComplete ? 'Complete' : `${Math.round(progress)}%`}</span>
        <span>{isComplete ? formatFileSize(fileSize) : `${formatFileSize(fileSize * progress / 100)} of ${formatFileSize(fileSize)}`}</span>
      </div>
    </div>
  );
} 