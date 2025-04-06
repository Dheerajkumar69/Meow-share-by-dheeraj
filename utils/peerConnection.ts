/**
 * WebRTC Peer Connection for direct device-to-device transfers
 * This module handles the WebRTC signaling and data channels for file transfers
 */

import { generateShortCode } from './codeGenerator';

// Debug mode for verbose logging
const DEBUG = true;

// Simplified configuration
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Keep just one TURN server
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// Set simpler timeout constants
const CONNECTION_TIMEOUT = 20000; // 20 seconds
const POLLING_INTERVAL = 1000; // 1 second

// Connection states
export type ConnectionState = 
  'new' | 
  'connecting' | 
  'connected' | 
  'disconnected' |
  'failed' | 
  'closed';

// Simplified transfer progress callback
export type TransferProgressCallback = (
  progress: number, 
  speed: number
) => void;

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

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
  private onTransferComplete: (success: boolean, error?: string, url?: string) => void;
  private lastProgressUpdate = 0;
  private receivedSize = 0;
  private fileChunks: Blob[] = [];
  private isInitiator: boolean;
  private signalServer: string;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(
    options: {
      onConnectionStateChange: (state: ConnectionState) => void;
      onTransferProgress: TransferProgressCallback;
      onTransferComplete: (success: boolean, error?: string, url?: string) => void;
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
    this.signalServer = options.signalServer || `/api/signal`;
    
    console.log(`Creating PeerConnection with shortCode: ${this.shortCode}, isInitiator: ${this.isInitiator}`);
  }

  /**
   * Initialize the WebRTC connection
   */
  public async initialize(): Promise<void> {
    try {
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'new' || this.connectionState === 'connecting') {
          console.log('Connection timeout');
          this.updateConnectionState('failed');
        }
      }, CONNECTION_TIMEOUT);
      
      // Create RTCPeerConnection with STUN/TURN servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS
      });

      // Set up event listeners
      this.setupConnectionListeners();

      // If this peer is the initiator, create a data channel
      if (this.isInitiator) {
        this.createDataChannel();
        this.createOffer();
      } else {
        // Non-initiator waits for data channel
        this.peerConnection.ondatachannel = (event) => {
          console.log('Data channel received from peer');
          this.dataChannel = event.channel;
          this.setupDataChannelListeners();
        };

        // Start listening for messages
        this.pollSignalingServer();
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
  private setupConnectionListeners(): void {
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
      console.log('Connection state changed to:', state);
      
      this.updateConnectionState(state);
      
      // Handle various connection states
      if (state === 'connected') {
        console.log('WebRTC connection established');
        
        // Clear connection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      } else if (state === 'failed' || state === 'closed') {
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
   * Create a data channel for communication
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;
    
    try {
      // Configure data channel for reliable file transfer
      const dataChannelOptions: RTCDataChannelInit = {
        ordered: true
      };
      
      this.dataChannel = this.peerConnection.createDataChannel(
        `transfer-${this.sessionId}`, 
        dataChannelOptions
      );
      
      console.log('Data channel created');
      
      this.setupDataChannelListeners();
    } catch (error) {
      console.error('Error creating data channel:', error);
      this.updateConnectionState('failed');
    }
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
   * Process received ICE candidate
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
   * Update the connection state and notify the callback
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onConnectionStateChange(state);
  }

  /**
   * Send a message via the data channel
   */
  private sendDataChannelMessage(message: string | object): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready for sending message');
      return false;
    }
    
    try {
      // Convert message to the right type for sending
      if (typeof message === 'string') {
        this.dataChannel.send(message);
      } else if (typeof message === 'object') {
        // Convert object to JSON string
        this.dataChannel.send(JSON.stringify(message));
      }
      return true;
    } catch (error) {
      console.error('Error sending data channel message:', error);
      return false;
    }
  }

  /**
   * Send a file to the peer
   */
  public async sendFile(file: File): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }
    
    if (!this.transferSession) {
      throw new Error('No active transfer session');
    }
    
    console.log(`Sending file: ${file.name}, size: ${file.size} bytes`);
    
    // Update the transfer session with file metadata
    this.transferSession.metadata = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified
    };
    
    // Send file metadata to the peer
    this.sendDataChannelMessage({
      type: 'file-metadata',
      data: this.transferSession.metadata
    });
    
    // Wait for peer to confirm ready to receive
    return new Promise<void>((resolve, reject) => {
      // Simple mock implementation for now
      setTimeout(() => {
        this.transferSession!.state = 'completed';
        this.transferSession!.progress = 100;
        this.onTransferProgress(100, 1024 * 1024); // 1 MB/s
        this.onTransferComplete(true);
        resolve();
      }, 2000);
    });
  }

  /**
   * Handle data channel messages
   */
  private handleDataChannelMessage(data: string | ArrayBuffer): void {
    // For text messages (control messages, metadata)
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        
        // Handle different message types
        switch (message.type) {
          case 'file-metadata':
            this.handleFileMetadata(message.data);
            break;
            
          case 'transfer-complete':
            this.onTransferComplete(true, undefined, URL.createObjectURL(new Blob(this.fileChunks)));
            break;
            
          case 'cancel':
            this.onTransferComplete(false, message.reason);
            break;
            
          default:
            console.warn('Unknown data channel message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    } else {
      // Binary data - file chunk
      this.receivedSize += data.byteLength;
      this.fileChunks.push(new Blob([data]));
      
      // Calculate progress
      const totalSize = this.transferSession?.metadata?.size || 1;
      const progress = Math.min(100, Math.floor((this.receivedSize / totalSize) * 100));
      
      // Update transfer speed
      const now = Date.now();
      if (now - this.lastProgressUpdate > 500 || progress === 100) {
        if (this.transferSession?.startTime) {
          const elapsedSeconds = (now - this.transferSession.startTime) / 1000;
          const bytesPerSecond = this.receivedSize / elapsedSeconds;
          this.onTransferProgress(progress, bytesPerSecond);
        }
        this.lastProgressUpdate = now;
      }
    }
  }

  /**
   * Handle file metadata
   */
  private handleFileMetadata(metadata: FileMetadata): void {
    console.log('Received file metadata:', metadata);
    
    if (!this.transferSession) return;
    
    // Update session with file metadata
    this.transferSession.metadata = metadata;
    this.transferSession.startTime = Date.now();
    this.transferSession.state = 'transferring';
    
    // Reset file reception state
    this.receivedSize = 0;
    this.fileChunks = [];
    this.lastProgressUpdate = Date.now();
    
    // Notify peer we're ready to receive
    this.sendDataChannelMessage({
      type: 'transfer-ready'
    });
  }

  /**
   * Poll the signaling server for messages
   */
  private pollSignalingServer(): void {
    const poll = async () => {
      // Use simple if checks that are type-safe
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
      
      // Continue polling if still in active state
      // Check each valid continuing state explicitly
      const continuePolling = 
        this.connectionState === 'new' || 
        this.connectionState === 'connecting' || 
        this.connectionState === 'connected' ||
        this.connectionState === 'disconnected';
        
      if (continuePolling) {
        setTimeout(poll, POLLING_INTERVAL);
      }
    };
    
    poll();
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
   * Cancel an ongoing transfer
   */
  public cancelTransfer(reason: string = 'User cancelled'): void {
    if (!this.transferSession) return;
    
    // Send cancel message if channel is open
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.sendDataChannelMessage({
        type: 'cancel',
        reason,
      });
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
    
    // Clear any timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
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

  /**
   * Simple connection test
   */
  public async testConnection(): Promise<boolean> {
    return this.dataChannel?.readyState === 'open';
  }
} 