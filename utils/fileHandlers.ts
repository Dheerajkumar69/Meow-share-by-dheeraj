/**
 * File handling utilities for large file transfers
 * Supports chunked uploads and downloads for files up to 3GB with dynamic chunking
 */

/**
 * Configuration for chunk-based file transfers
 */
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 3 * 1024 * 1024 * 1024, // 3GB in bytes
  MIN_CHUNK_SIZE: 512 * 1024, // 512KB minimum chunk size
  MAX_CHUNK_SIZE: 8 * 1024 * 1024, // 8MB maximum chunk size
  INITIAL_CHUNK_SIZE: 2 * 1024 * 1024, // 2MB initial chunk size
  MAX_PARALLEL_CHUNKS: 6, // Maximum parallel transfers
  SPEED_MEASUREMENT_INTERVAL: 500, // ms between speed measurements
  SPEED_HISTORY_SIZE: 5, // Number of speed measurements to keep for averaging
};

/**
 * Represents a file chunk for transfer
 */
export interface FileChunk {
  index: number;
  start: number;
  end: number;
  data: ArrayBuffer;
}

/**
 * Adaptive chunk size manager for optimizing transfer speeds
 */
export class ChunkSizeOptimizer {
  private currentChunkSize: number;
  private speedHistory: number[] = [];
  private lastMeasurement: number = 0;
  private bytesTransferred: number = 0;
  private bytesAtLastMeasure: number = 0;
  private adaptationEnabled: boolean = true;
  
  constructor(initialChunkSize = FILE_CONFIG.INITIAL_CHUNK_SIZE) {
    this.currentChunkSize = initialChunkSize;
  }

  /**
   * Record bytes transferred for speed calculation
   */
  addBytesTransferred(bytes: number): void {
    this.bytesTransferred += bytes;
    
    const now = Date.now();
    
    // Only calculate speed after the interval has passed
    if (now - this.lastMeasurement >= FILE_CONFIG.SPEED_MEASUREMENT_INTERVAL) {
      // Calculate speed in bytes per second
      const timeDiffSeconds = (now - this.lastMeasurement) / 1000;
      const bytesDiff = this.bytesTransferred - this.bytesAtLastMeasure;
      const currentSpeed = bytesDiff / timeDiffSeconds;
      
      // Add to speed history, keeping only the last N measurements
      this.speedHistory.push(currentSpeed);
      if (this.speedHistory.length > FILE_CONFIG.SPEED_HISTORY_SIZE) {
        this.speedHistory.shift();
      }
      
      // Update measurement timestamp and bytes count
      this.lastMeasurement = now;
      this.bytesAtLastMeasure = this.bytesTransferred;
      
      // Only adapt chunk size after we have enough measurements
      if (this.adaptationEnabled && this.speedHistory.length >= 3) {
        this.adaptChunkSize();
      }
    }
  }

  /**
   * Get the current average speed in bytes per second
   */
  getCurrentSpeed(): number {
    if (this.speedHistory.length === 0) return 0;
    
    // Calculate average speed from history
    const sum = this.speedHistory.reduce((acc, speed) => acc + speed, 0);
    return sum / this.speedHistory.length;
  }

  /**
   * Dynamically adjust chunk size based on transfer speed
   */
  private adaptChunkSize(): void {
    const avgSpeed = this.getCurrentSpeed();
    
    // If speed is very high, increase chunk size to reduce overhead
    if (avgSpeed > 5 * 1024 * 1024) { // > 5 MB/s
      this.increaseChunkSize();
    } 
    // If speed is low, decrease chunk size to reduce latency
    else if (avgSpeed < 500 * 1024) { // < 500 KB/s
      this.decreaseChunkSize();
    }
    
    // If very low speed detected, drastically reduce chunk size
    if (avgSpeed < 100 * 1024) { // < 100 KB/s
      this.currentChunkSize = Math.max(FILE_CONFIG.MIN_CHUNK_SIZE, this.currentChunkSize / 2);
      console.log(`Very slow connection detected, reducing chunk size to ${this.currentChunkSize / 1024}KB`);
    }
  }

  /**
   * Increase chunk size by 25%, up to maximum
   */
  private increaseChunkSize(): void {
    const newSize = Math.min(
      FILE_CONFIG.MAX_CHUNK_SIZE,
      Math.floor(this.currentChunkSize * 1.25)
    );
    
    if (newSize !== this.currentChunkSize) {
      console.log(`Increasing chunk size from ${this.currentChunkSize / 1024}KB to ${newSize / 1024}KB`);
      this.currentChunkSize = newSize;
    }
  }

  /**
   * Decrease chunk size by 20%, down to minimum
   */
  private decreaseChunkSize(): void {
    const newSize = Math.max(
      FILE_CONFIG.MIN_CHUNK_SIZE,
      Math.floor(this.currentChunkSize * 0.8)
    );
    
    if (newSize !== this.currentChunkSize) {
      console.log(`Decreasing chunk size from ${this.currentChunkSize / 1024}KB to ${newSize / 1024}KB`);
      this.currentChunkSize = newSize;
    }
  }

  /**
   * Get current optimized chunk size
   */
  getChunkSize(): number {
    return this.currentChunkSize;
  }
  
  /**
   * Reset optimizer state
   */
  reset(): void {
    this.speedHistory = [];
    this.lastMeasurement = Date.now();
    this.bytesTransferred = 0;
    this.bytesAtLastMeasure = 0;
    this.currentChunkSize = FILE_CONFIG.INITIAL_CHUNK_SIZE;
  }
  
  /**
   * Enable or disable dynamic adaptation
   */
  setAdaptationEnabled(enabled: boolean): void {
    this.adaptationEnabled = enabled;
  }
  
  /**
   * Get total bytes transferred
   */
  getTotalBytesTransferred(): number {
    return this.bytesTransferred;
  }
}

/**
 * Calculate required chunks based on current optimizer settings
 */
const calculateChunks = (
  fileSize: number, 
  optimizer: ChunkSizeOptimizer
): Array<{ index: number, start: number, end: number }> => {
  const chunkSize = optimizer.getChunkSize();
  const totalChunks = Math.ceil(fileSize / chunkSize);
  const chunks = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(fileSize, start + chunkSize);
    
    chunks.push({
      index: i,
      start,
      end,
    });
  }
  
  return chunks;
};

/**
 * Reads a specific chunk from a file
 * @param file The source file
 * @param start Start byte position
 * @param end End byte position
 * @returns Promise resolving to the chunk data as ArrayBuffer
 */
export const readFileChunk = (file: File, start: number, end: number): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read chunk as ArrayBuffer'));
      }
    };
    reader.onerror = (e) => reject(e.target?.error || new Error('Unknown error reading file chunk'));
    
    // Slice the file to get just this chunk
    const chunk = file.slice(start, end);
    reader.readAsArrayBuffer(chunk);
  });
};

/**
 * Process an uploaded file using dynamic chunk sizing
 * @param file The file to process
 * @param onProgress Callback for progress updates
 * @returns Promise with the file ID
 */
export const processFileUpload = async (
  file: File, 
  onProgress: (progress: number, speed: number) => void
): Promise<string> => {
  // Validate file size
  if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum allowed size of ${FILE_CONFIG.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`);
  }

  // Initialize the chunk size optimizer
  const optimizer = new ChunkSizeOptimizer();
  
  // Track upload state
  let uploadedBytes = 0;
  let uploadedChunks = 0;
  let activeTransfers = 0;
  let chunksToProcess = calculateChunks(file.size, optimizer);
  let totalChunks = chunksToProcess.length;
  
  // For throttling parallel uploads
  const uploadQueue = [...chunksToProcess];
  
  // Report initial state
  onProgress(0, 0);
  
  // Upload a single chunk
  const uploadChunk = async (chunkInfo: { index: number, start: number, end: number }): Promise<void> => {
    try {
      activeTransfers++;
      
      // Read the chunk from the file
      const chunkData = await readFileChunk(file, chunkInfo.start, chunkInfo.end);
      const chunkSize = chunkInfo.end - chunkInfo.start;
      
      // In a real app, we would upload this chunk to the server
      // Simulate network delay and processing time with variable speed
      const simulatedBandwidth = (3 + Math.random() * 10) * 1024 * 1024; // 3-13 MB/s
      const simulatedLatency = 20 + Math.random() * 100; // 20-120ms
      const transferTime = Math.max(50, (chunkSize / simulatedBandwidth) * 1000 + simulatedLatency);
      
      await new Promise(resolve => setTimeout(resolve, transferTime));
      
      // Update progress
      uploadedBytes += chunkSize;
      uploadedChunks++;
      
      // Update optimizer with transferred bytes for speed calculation
      optimizer.addBytesTransferred(chunkSize);
      
      // Calculate progress percentage
      const progress = Math.round((uploadedBytes / file.size) * 100);
      const currentSpeed = optimizer.getCurrentSpeed();
      
      // Report progress and speed
      onProgress(progress, currentSpeed);
      
      activeTransfers--;
    } catch (error) {
      console.error(`Error uploading chunk ${chunkInfo.index}:`, error);
      activeTransfers--;
      throw error;
    }
  };
  
  // Process the upload queue with adaptive parallelism
  const processQueue = async (): Promise<void> => {
    while (uploadQueue.length > 0) {
      // Dynamically adjust parallel transfers based on connection quality
      const currentSpeed = optimizer.getCurrentSpeed();
      let maxParallel = FILE_CONFIG.MAX_PARALLEL_CHUNKS;
      
      // For slow connections, reduce parallelism
      if (currentSpeed > 0) {
        if (currentSpeed < 500 * 1024) { // < 500 KB/s
          maxParallel = 2;
        } else if (currentSpeed < 2 * 1024 * 1024) { // < 2 MB/s
          maxParallel = 4;
        }
      }
      
      // Process as many chunks in parallel as allowed
      while (uploadQueue.length > 0 && activeTransfers < maxParallel) {
        const chunk = uploadQueue.shift();
        if (chunk) {
          // Don't await - we want these to run in parallel
          uploadChunk(chunk).catch(err => {
            console.error('Chunk upload failed:', err);
            // Put failed chunks back in the queue
            uploadQueue.push(chunk);
          });
        }
      }
      
      // If we've filled up our parallel slots or queue is empty, wait a bit
      if (uploadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Every 10 chunks processed, recalculate chunks based on optimized size
      if (uploadedChunks % 10 === 0 && uploadQueue.length > 5) {
        // Get the remaining file portion
        const processedBytes = uploadedBytes;
        const remainingBytes = file.size - processedBytes;
        
        if (remainingBytes > optimizer.getChunkSize() * 5) {
          // Only recalculate if it's worthwhile
          // Create a "sub-file" view of the remaining data
          const remainingOffset = processedBytes;
          const remainingChunks = calculateChunks(remainingBytes, optimizer)
            .map(chunk => ({
              index: chunk.index + totalChunks - uploadQueue.length,
              start: chunk.start + remainingOffset,
              end: chunk.end + remainingOffset
            }));
          
          // Replace the upload queue with the newly sized chunks
          uploadQueue.length = 0;
          uploadQueue.push(...remainingChunks);
        }
      }
    }
  };
  
  // Generate a file ID and start processing
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  await processQueue();
  
  return fileId;
};

/**
 * Downloads a file using dynamic chunking for optimal speed
 * @param fileId The file ID to download
 * @param fileName Filename for the downloaded file
 * @param fileSize Total file size in bytes
 * @param mimeType The file's MIME type
 * @param onProgress Callback for progress updates
 * @returns Promise that resolves when download is complete
 */
export const downloadFileInChunks = async (
  fileId: string,
  fileName: string,
  fileSize: number,
  mimeType = 'application/octet-stream',
  onProgress: (progress: number, speed: number) => void
): Promise<void> => {
  // Initialize the chunk size optimizer
  const optimizer = new ChunkSizeOptimizer();
  
  // Calculate initial chunks
  let chunksToProcess = calculateChunks(fileSize, optimizer);
  let totalChunks = chunksToProcess.length;
  
  // Array to store all chunks in order
  const chunks: (ArrayBuffer | null)[] = new Array(totalChunks).fill(null);
  
  // Keep track of download state
  let downloadedBytes = 0;
  let downloadedChunks = 0;
  let activeTransfers = 0;
  
  // Report initial state
  onProgress(0, 0);
  
  // Queue of chunks to download
  const downloadQueue = [...chunksToProcess];
  
  // Download a single chunk
  const downloadChunk = async (chunkInfo: { index: number, start: number, end: number }): Promise<void> => {
    try {
      activeTransfers++;
      
      // In a real app, we would fetch this chunk from the server
      // For this demo, we'll create synthetic chunk data with variable speeds
      const chunkSize = chunkInfo.end - chunkInfo.start;
      const chunkData = new ArrayBuffer(chunkSize);
      const view = new Uint8Array(chunkData);
      
      // Fill with patterned data
      for (let i = 0; i < chunkSize; i++) {
        view[i] = (chunkInfo.start + i) % 256;
      }
      
      // Simulate network conditions: speed varies based on chunk index
      // This creates a realistic scenario where network conditions fluctuate
      let mbps: number;
      
      if (chunkInfo.index % 20 < 5) {
        // Occasional slow periods
        mbps = 0.5 + Math.random() * 1.5; // 0.5-2 MB/s
      } else if (chunkInfo.index % 20 < 15) {
        // Normal speed
        mbps = 3 + Math.random() * 5; // 3-8 MB/s
      } else {
        // Occasional bursts of speed
        mbps = 10 + Math.random() * 15; // 10-25 MB/s
      }
      
      // Calculate delay based on chunk size and simulated bandwidth
      const bytesPerMs = (mbps * 1024 * 1024) / 1000;
      const transferTime = Math.max(20, chunkSize / bytesPerMs) + (15 + Math.random() * 30);
      
      // Simulate the transfer
      await new Promise(resolve => setTimeout(resolve, transferTime));
      
      // Store the chunk in the correct position
      chunks[chunkInfo.index] = chunkData;
      
      // Update progress
      downloadedBytes += chunkSize;
      downloadedChunks++;
      
      // Update optimizer with transferred bytes
      optimizer.addBytesTransferred(chunkSize);
      
      // Calculate progress percentage
      const progress = Math.min(99, Math.round((downloadedBytes / fileSize) * 100));
      const currentSpeed = optimizer.getCurrentSpeed();
      
      // Report progress and speed
      onProgress(progress, currentSpeed);
      
      activeTransfers--;
    } catch (error) {
      console.error(`Error downloading chunk ${chunkInfo.index}:`, error);
      activeTransfers--;
      throw error;
    }
  };
  
  // Process download queue with adaptive parallelism
  const processQueue = async (): Promise<void> => {
    while (downloadQueue.length > 0) {
      // Dynamically adjust parallel downloads based on connection quality
      const currentSpeed = optimizer.getCurrentSpeed();
      let maxParallel = FILE_CONFIG.MAX_PARALLEL_CHUNKS;
      
      // Adjust parallelism based on speed
      if (currentSpeed > 0) {
        if (currentSpeed < 300 * 1024) { // Very slow (< 300 KB/s)
          maxParallel = 2;
        } else if (currentSpeed < 1 * 1024 * 1024) { // Slow (< 1 MB/s)
          maxParallel = 3;
        } else if (currentSpeed > 10 * 1024 * 1024) { // Very fast (> 10 MB/s)
          maxParallel = 8; // Increase beyond the default for fast connections
        }
      }
      
      // Process as many chunks in parallel as allowed
      while (downloadQueue.length > 0 && activeTransfers < maxParallel) {
        const chunk = downloadQueue.shift();
        if (chunk) {
          // Don't await - we want these to run in parallel
          downloadChunk(chunk).catch(err => {
            console.error('Chunk download failed:', err);
            // Put failed chunks back in the queue
            downloadQueue.push(chunk);
          });
        }
      }
      
      // If we've filled up our parallel slots or queue is empty, wait a bit
      if (downloadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Every 10 chunks processed, recalculate chunks based on optimized size
      if (downloadedChunks % 10 === 0 && downloadQueue.length > 5) {
        // Calculate processed bytes precisely
        const processedBytes = fileSize - downloadQueue.reduce(
          (sum, chunk) => sum + (chunk.end - chunk.start), 0
        );
        const remainingBytes = fileSize - processedBytes;
        
        if (remainingBytes > optimizer.getChunkSize() * 5) {
          // Only recalculate if it's worthwhile
          const remainingOffset = processedBytes;
          const remainingChunks = calculateChunks(remainingBytes, optimizer)
            .map(chunk => ({
              index: totalChunks - downloadQueue.length + chunk.index,
              start: chunk.start + remainingOffset,
              end: chunk.end + remainingOffset
            }));
          
          // Replace the download queue with the newly sized chunks
          downloadQueue.length = 0;
          downloadQueue.push(...remainingChunks);
          
          // Ensure chunks array has enough slots
          if (remainingChunks.length > 0) {
            const newMaxIndex = remainingChunks[remainingChunks.length - 1].index;
            if (newMaxIndex >= chunks.length) {
              chunks.length = newMaxIndex + 1;
              chunks.fill(null, totalChunks);
              totalChunks = chunks.length;
            }
          }
        }
      }
    }
  };
  
  // Start the download process
  await processQueue();
  
  // Final progress update
  onProgress(100, optimizer.getCurrentSpeed());
  
  // Combine all chunks, filtering out any nulls
  const validChunks = chunks.filter(chunk => chunk !== null) as ArrayBuffer[];
  const completeFile = new Blob(validChunks, { type: mimeType });
  
  // Create download link
  const url = URL.createObjectURL(completeFile);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
};

/**
 * Formats a file size for display
 * @param bytes Size in bytes
 * @returns Formatted string with appropriate unit
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats a transfer speed for display
 * @param bytesPerSecond Speed in bytes per second
 * @returns Formatted string with appropriate unit
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s';
  
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}; 