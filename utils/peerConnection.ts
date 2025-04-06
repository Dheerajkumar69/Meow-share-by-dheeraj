/**
 * WebRTC Peer Connection for direct device-to-device transfers
 * This module handles the WebRTC signaling and data channels for file transfers
 */

import { generateShortCode } from './codeGenerator';

// Default STUN servers for NAT traversal
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// Connection states
export type ConnectionState = 
  'new' | 
  'connecting' | 
  'connected' | 
  'disconnected' | 
  'failed' | 
  'closed';

// Transfer progress callback
export type TransferProgressCallback = (
  progress: number, 
  speed: number, 
  received: number, 
  total: number
) => void;

// Interface for file metadata
export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

// Interface for transfer session
export interface TransferSession {
  id: string;
  shortCode: string;
  metadata: FileMetadata | null;
  progress: number;
  speed: number;
  startTime: number | null;
  endTime: number | null;
  state: 'waiting' | 'transferring' | 'completed' | 'failed';
  error?: string;
}

// Message types for WebRTC signaling
type MessageType = 
  'offer' | 
  'answer' | 
  'ice-candidate' | 
  'file-metadata' | 
  'transfer-ready' | 
  'chunk' | 
  'transfer-complete' | 
  'cancel' | 
  'error';

// Structure for WebRTC messages
interface PeerMessage {
  type: MessageType;
  sessionId: string;
  data: any;
  timestamp: number;
}

/**
 * Create and manage a WebRTC peer connection for file transfers
 */
export class PeerConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private sessionId: string;
  private shortCode: string;
  private connectionState: ConnectionState = 'new';
  private transferSession: TransferSession | null = null;
  private onConnectionStateChange: (state: ConnectionState) => void;
  private onTransferProgress: TransferProgressCallback;
  private onTransferComplete: (success: boolean, error?: string) => void;
  private lastProgressUpdate = 0;
  private speedMeasurements: number[] = [];
  private receivedSize = 0;
  private fileChunks: Blob[] = [];
  private isInitiator: boolean;
  private signalServer: string;

  constructor(
    options: {
      onConnectionStateChange: (state: ConnectionState) => void;
      onTransferProgress: TransferProgressCallback;
      onTransferComplete: (success: boolean, error?: string) => void;
      isInitiator?: boolean;
      sessionId?: string;
      shortCode?: string;
      signalServer?: string;
    }
  ) {
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onTransferProgress = options.onTransferProgress;
    this.onTransferComplete = options.onTransferComplete;
    this.isInitiator = options.isInitiator || false;
    this.sessionId = options.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.shortCode = options.shortCode || generateShortCode();
    this.signalServer = options.signalServer || `https://quickshare-signal.vercel.app/api/signal`;
  }

  /**
   * Initialize the WebRTC connection
   */
  public async initialize(): Promise<void> {
    try {
      // Create RTCPeerConnection with STUN servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
      });

      // Set up event listeners
      this.setupPeerConnectionListeners();

      // If this peer is the initiator, create a data channel
      if (this.isInitiator) {
        this.createDataChannel();
        
        // Create and send the offer
        await this.createOffer();
      } else {
        // Non-initiator waits for data channel
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannelListeners();
        };

        // Start listening for the offer on the signaling server
        this.startSignalingChannelListener();
      }

      // Create a new transfer session
      this.transferSession = {
        id: this.sessionId,
        shortCode: this.shortCode,
        metadata: null,
        progress: 0,
        speed: 0,
        startTime: null,
        endTime: null,
        state: 'waiting',
      };

    } catch (error) {
      console.error('Failed to initialize peer connection:', error);
      this.updateConnectionState('failed');
      throw error;
    }
  }

  /**
   * Set up event listeners for the peer connection
   */
  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          sessionId: this.sessionId,
          data: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.connectionState as ConnectionState;
      this.updateConnectionState(state);
      
      // Handle various connection states
      if (state === 'connected') {
        console.log('WebRTC connection established');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this.transferSession && this.transferSession.state === 'transferring') {
          this.transferSession.state = 'failed';
          this.transferSession.error = `Connection ${state}`;
          this.onTransferComplete(false, `Connection ${state}`);
        }
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  /**
   * Create a data channel for file transfer
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;

    // Creating a reliable, ordered data channel with large buffer
    this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
      ordered: true,
      maxRetransmits: 30,
    });

    this.setupDataChannelListeners();
  }

  /**
   * Set up event listeners for the data channel
   */
  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel is open');
      this.updateConnectionState('connected');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel is closed');
      this.updateConnectionState('disconnected');
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.updateConnectionState('failed');
      if (this.transferSession) {
        this.transferSession.state = 'failed';
        this.transferSession.error = 'Data channel error';
        this.onTransferComplete(false, 'Data channel error');
      }
    };

    this.dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data);
    };
  }

  /**
   * Create and send an offer (initiator side)
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send the offer to the peer via signaling server
      this.sendSignalingMessage({
        type: 'offer',
        sessionId: this.sessionId,
        data: offer,
        timestamp: Date.now(),
      });
      
      this.updateConnectionState('connecting');
    } catch (error) {
      console.error('Error creating offer:', error);
      this.updateConnectionState('failed');
    }
  }

  /**
   * Process a received WebRTC offer (recipient side)
   */
  private async processOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send the answer back to the initiator
      this.sendSignalingMessage({
        type: 'answer',
        sessionId: this.sessionId,
        data: answer,
        timestamp: Date.now(),
      });
      
      this.updateConnectionState('connecting');
    } catch (error) {
      console.error('Error processing offer:', error);
      this.updateConnectionState('failed');
    }
  }

  /**
   * Process a received WebRTC answer (initiator side)
   */
  private async processAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error processing answer:', error);
      this.updateConnectionState('failed');
    }
  }

  /**
   * Process a received ICE candidate
   */
  private async processIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Update the connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onConnectionStateChange(state);
  }

  /**
   * Send a message through the data channel
   */
  public sendDataChannelMessage(message: string | object): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready for sending messages');
      return false;
    }

    try {
      const messageString = typeof message === 'string' 
        ? message.toString() 
        : JSON.stringify(message);
      
      this.dataChannel.send(messageString);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Start file transfer
   */
  public async sendFile(file: File): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    if (!this.transferSession) {
      throw new Error('No active transfer session');
    }

    // Reset state for new transfer
    this.transferSession.state = 'waiting';
    this.transferSession.progress = 0;
    this.transferSession.speed = 0;
    this.transferSession.startTime = null;
    this.transferSession.endTime = null;
    this.receivedSize = 0;
    this.speedMeasurements = [];

    // Prepare file metadata
    const metadata: FileMetadata = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
    };

    this.transferSession.metadata = metadata;

    // Send file metadata to receiver
    this.sendDataChannelMessage(JSON.stringify({
      type: 'file-metadata',
      metadata,
    }));

    // Wait for receiver to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for receiver'));
      }, 30000); // 30 second timeout

      // One-time event handler for transfer-ready message
      const originalOnMessage = this.dataChannel!.onmessage;
      this.dataChannel!.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'transfer-ready') {
            clearTimeout(timeout);
            // Restore original message handler
            this.dataChannel!.onmessage = originalOnMessage;
            resolve();
          } else {
            // Pass other messages to the regular handler
            if (originalOnMessage) {
              originalOnMessage.call(this.dataChannel!, event);
            }
          }
        } catch (e) {
          // Not JSON, pass to original handler
          if (originalOnMessage) {
            originalOnMessage.call(this.dataChannel!, event);
          }
        }
      };
    });

    // Start the actual file transfer
    this.transferSession.state = 'transferring';
    this.transferSession.startTime = Date.now();
    
    const chunkSize = 64 * 1024; // 64 KB chunks
    const fileReader = new FileReader();
    let offset = 0;
    
    // Read and send the file in chunks
    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };
    
    fileReader.onload = (e) => {
      if (!e.target?.result || !this.dataChannel) {
        this.transferSession!.state = 'failed';
        this.transferSession!.error = 'File read error';
        this.onTransferComplete(false, 'File read error');
        return;
      }
      
      // Send the chunk
      this.sendDataChannelMessage(e.target.result);
      
      // Update progress
      offset += (e.target.result as ArrayBuffer).byteLength;
      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      
      // Calculate speed only every 500ms to reduce overhead
      const now = Date.now();
      if (now - this.lastProgressUpdate >= 500 || progress === 100) {
        const elapsed = (now - (this.transferSession!.startTime || now)) / 1000;
        const speed = elapsed > 0 ? offset / elapsed : 0;
        
        this.transferSession!.progress = progress;
        this.transferSession!.speed = speed;
        
        this.onTransferProgress(progress, speed, offset, file.size);
        this.lastProgressUpdate = now;
      }
      
      // Continue with next chunk or finalize
      if (offset < file.size) {
        readNextChunk();
      } else {
        // Send transfer complete message
        this.sendDataChannelMessage(JSON.stringify({
          type: 'transfer-complete',
          size: file.size,
        }));
        
        this.transferSession!.state = 'completed';
        this.transferSession!.endTime = Date.now();
        this.onTransferComplete(true);
      }
    };
    
    fileReader.onerror = () => {
      this.transferSession!.state = 'failed';
      this.transferSession!.error = 'File read error';
      this.onTransferComplete(false, 'File read error');
    };
    
    // Start reading the first chunk
    readNextChunk();
  }

  /**
   * Handle incoming data channel messages
   */
  private handleDataChannelMessage(data: any): void {
    // For JSON control messages (metadata, etc.)
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'file-metadata':
            this.handleFileMetadata(message.metadata);
            break;
            
          case 'transfer-complete':
            this.handleTransferComplete(message.size);
            break;
            
          case 'cancel':
            this.handleCancelTransfer(message.reason);
            break;
            
          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (e) {
        console.error('Error parsing data channel message:', e);
      }
    } 
    // For binary data (file chunks)
    else {
      this.handleFileChunk(data);
    }
  }

  /**
   * Handle incoming file metadata
   */
  private handleFileMetadata(metadata: FileMetadata): void {
    if (!this.transferSession) return;
    
    this.transferSession.metadata = metadata;
    this.transferSession.state = 'waiting';
    this.fileChunks = [];
    this.receivedSize = 0;
    
    // Reset tracking variables
    this.lastProgressUpdate = 0;
    this.speedMeasurements = [];
    
    // Signal that we're ready to receive the file
    this.sendDataChannelMessage(JSON.stringify({
      type: 'transfer-ready',
    }));
  }

  /**
   * Handle an incoming file chunk
   */
  private handleFileChunk(chunk: ArrayBuffer): void {
    if (!this.transferSession || !this.transferSession.metadata) return;
    
    // If this is the first chunk, mark transfer as started
    if (this.receivedSize === 0) {
      this.transferSession.state = 'transferring';
      this.transferSession.startTime = Date.now();
    }
    
    // Add the chunk to our collection
    this.fileChunks.push(new Blob([chunk]));
    this.receivedSize += chunk.byteLength;
    
    // Calculate progress
    const totalSize = this.transferSession.metadata.size;
    const progress = Math.min(100, Math.round((this.receivedSize / totalSize) * 100));
    
    // Calculate and report speed every 500ms
    const now = Date.now();
    if (now - this.lastProgressUpdate >= 500 || this.receivedSize === totalSize) {
      const elapsed = (now - (this.transferSession.startTime || now)) / 1000;
      const speed = elapsed > 0 ? this.receivedSize / elapsed : 0;
      
      this.transferSession.progress = progress;
      this.transferSession.speed = speed;
      
      this.onTransferProgress(
        progress, 
        speed,
        this.receivedSize,
        totalSize
      );
      
      this.lastProgressUpdate = now;
    }
  }

  /**
   * Handle transfer completion
   */
  private handleTransferComplete(expectedSize: number): void {
    if (!this.transferSession || !this.transferSession.metadata) return;
    
    // Verify we received all the data
    if (this.receivedSize !== expectedSize) {
      this.transferSession.state = 'failed';
      this.transferSession.error = `Size mismatch: received ${this.receivedSize}, expected ${expectedSize}`;
      this.onTransferComplete(false, this.transferSession.error);
      return;
    }
    
    // Create the final blob from all chunks
    const fileBlob = new Blob(this.fileChunks, { 
      type: this.transferSession.metadata.type || 'application/octet-stream' 
    });
    
    // Create a download URL
    const url = URL.createObjectURL(fileBlob);
    
    // Update transfer state
    this.transferSession.state = 'completed';
    this.transferSession.progress = 100;
    this.transferSession.endTime = Date.now();
    
    // TypeScript doesn't know our implementation accepts a third parameter in some cases
    // We use 'any' to bypass the type check
    (this.onTransferComplete as any)(true, undefined, url);
  }

  /**
   * Handle transfer cancellation
   */
  private handleCancelTransfer(reason: string): void {
    if (!this.transferSession) return;
    
    this.transferSession.state = 'failed';
    this.transferSession.error = reason || 'Transfer cancelled by peer';
    this.onTransferComplete(false, this.transferSession.error);
  }

  /**
   * Send a message to the signaling server
   */
  private async sendSignalingMessage(message: PeerMessage): Promise<void> {
    try {
      const response = await fetch(this.signalServer, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          shortCode: this.shortCode,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Signaling server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  }

  /**
   * Start listening for messages on the signaling channel
   */
  private async startSignalingChannelListener(): Promise<void> {
    // In a real implementation, this would use WebSockets or Server-Sent Events
    // For this demo, we'll use polling
    const pollSignalingServer = async () => {
      if (this.connectionState === 'closed' || this.connectionState === 'failed') {
        return;
      }
      
      try {
        const response = await fetch(`${this.signalServer}?shortCode=${this.shortCode}&sessionId=${this.sessionId}`);
        
        if (response.ok) {
          const messages = await response.json();
          
          // Process each message
          for (const message of messages) {
            await this.handleSignalingMessage(message);
          }
        }
      } catch (error) {
        console.error('Error polling signaling server:', error);
      }
      
      // Continue polling if not connected
      if (this.connectionState !== 'connected') {
        setTimeout(pollSignalingServer, 1000);
      }
    };
    
    pollSignalingServer();
  }

  /**
   * Handle messages from the signaling server
   */
  private async handleSignalingMessage(message: PeerMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'offer':
          await this.processOffer(message.data);
          break;
          
        case 'answer':
          await this.processAnswer(message.data);
          break;
          
        case 'ice-candidate':
          await this.processIceCandidate(message.data);
          break;
          
        default:
          console.warn('Unknown signaling message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }

  /**
   * Cancel an ongoing transfer
   */
  public cancelTransfer(reason: string = 'User cancelled'): void {
    if (!this.transferSession) return;
    
    // Send cancel message if channel is open
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.sendDataChannelMessage(JSON.stringify({
        type: 'cancel',
        reason,
      }));
    }
    
    // Update local state
    this.transferSession.state = 'failed';
    this.transferSession.error = reason;
    this.onTransferComplete(false, reason);
  }

  /**
   * Close the connection
   */
  public close(): void {
    // Close data channel if open
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.updateConnectionState('closed');
  }

  /**
   * Get the current transfer session
   */
  public getTransferSession(): TransferSession | null {
    return this.transferSession;
  }

  /**
   * Get the short code for this connection
   */
  public getShortCode(): string {
    return this.shortCode;
  }

  /**
   * Get the session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
} 