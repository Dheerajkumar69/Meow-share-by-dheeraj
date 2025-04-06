/**
 * WebRTC Peer Connection for direct device-to-device transfers
 * This module handles the WebRTC signaling and data channels for file transfers
 */

import { generateShortCode } from './codeGenerator';

// Debug mode for verbose logging
const DEBUG = true;

// Default ICE servers for NAT traversal
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  // Free TURN servers from different providers for redundancy
  {
    urls: 'turn:global.turn.twilio.com:3478?transport=udp',
    username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d',
    credential: 'w1WpRk/J+Xr+iy+mHo/soJz9WTHQHPOnl5kGnddXMQY='
  },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// Maximum time to wait for ICE candidate gathering before proceeding anyway
const ICE_GATHERING_TIMEOUT = 10000; // 10 seconds

// Polling intervals for signaling server
const POLLING_INTERVAL_CONNECTING = 500; // 500ms during connection setup
const POLLING_INTERVAL_CONNECTED = 2000; // 2 seconds when connected
const CONNECTION_TIMEOUT = 60000; // 60 seconds

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
  'error' |
  'ping' |
  'pong';

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
  private onTransferComplete: (success: boolean, error?: string, url?: string) => void;
  private lastProgressUpdate = 0;
  private speedMeasurements: number[] = [];
  private receivedSize = 0;
  private fileChunks: Blob[] = [];
  private isInitiator: boolean;
  private signalServer: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private iceCandidatesGathered: boolean = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

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
    // Use relative path for local development, fall back to absolute for production
    this.signalServer = options.signalServer || 
                        (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                          ? '/api/signal'
                          : `${window.location.origin}/api/signal`);
    
    if (DEBUG) console.log(`Creating PeerConnection with shortCode: ${this.shortCode}, isInitiator: ${this.isInitiator}`);
  }

  /**
   * Initialize the WebRTC connection
   */
  public async initialize(): Promise<void> {
    try {
      // Start connection timeout to prevent hanging
      this.setConnectionTimeout();
      
      if (DEBUG) console.log('Initializing peer connection with ICE servers:', DEFAULT_ICE_SERVERS);
      
      // Create RTCPeerConnection with STUN/TURN servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 10, // Increase candidate pool for better connectivity
      });

      // Set up event listeners
      this.setupPeerConnectionListeners();

      // If this peer is the initiator, create a data channel
      if (this.isInitiator) {
        this.createDataChannel();
        
        // Create and send the offer after a short delay to allow ICE gathering to begin
        setTimeout(async () => {
          await this.createOffer();
        }, 500);
      } else {
        // Non-initiator waits for data channel
        this.peerConnection.ondatachannel = (event) => {
          if (DEBUG) console.log('Data channel received from peer');
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
   * Set connection timeout to prevent hanging in connecting state
   */
  private setConnectionTimeout(): void {
    // Clear any existing timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Set new timeout
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState === 'new' || this.connectionState === 'connecting') {
        if (DEBUG) console.log('Connection timeout - attempting reconnect or fallback');
        this.attemptReconnect();
      }
    }, CONNECTION_TIMEOUT);
  }

  /**
   * Attempt to reconnect after failure or timeout
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (DEBUG) console.log('Max reconnect attempts reached, giving up');
      this.updateConnectionState('failed');
      return;
    }
    
    this.reconnectAttempts++;
    if (DEBUG) console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    // Close existing connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Create new connection
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 10,
      });
      
      // Set up event listeners
      this.setupPeerConnectionListeners();
      
      if (this.isInitiator) {
        this.createDataChannel();
        this.createOffer();
      } else {
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannelListeners();
        };
      }
      
      // Reset connection timeout
      this.setConnectionTimeout();
      
    } catch (error) {
      console.error('Failed to reconnect:', error);
      this.updateConnectionState('failed');
    }
  }

  /**
   * Set up event listeners for the peer connection
   */
  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (DEBUG) console.log('ICE candidate:', event.candidate);
      
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          sessionId: this.sessionId,
          data: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      } else {
        if (DEBUG) console.log('ICE candidate gathering complete');
        this.iceCandidatesGathered = true;
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.connectionState as ConnectionState;
      if (DEBUG) console.log('Connection state changed to:', state);
      
      this.updateConnectionState(state);
      
      // Handle various connection states
      if (state === 'connected') {
        console.log('WebRTC connection established');
        // Clear connection timeout since we're connected
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        // Start heartbeats to keep connection alive
        this.startHeartbeat();
      } else if (state === 'disconnected') {
        // Try to recover from disconnection
        this.handleDisconnect();
      } else if (state === 'failed' || state === 'closed') {
        if (this.transferSession && this.transferSession.state === 'transferring') {
          this.transferSession.state = 'failed';
          this.transferSession.error = `Connection ${state}`;
          this.onTransferComplete(false, `Connection ${state}`);
        }
        
        // Clear all intervals and timeouts
        this.clearAllTimers();
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      if (DEBUG) console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      
      // If ICE connection fails, attempt to recover
      if (this.peerConnection?.iceConnectionState === 'failed') {
        this.handleICEFailure();
      }
    };
    
    // Track gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      if (DEBUG) console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
      
      // If gathering takes too long, proceed anyway after a timeout
      if (this.peerConnection?.iceGatheringState === 'gathering') {
        setTimeout(() => {
          if (!this.iceCandidatesGathered && 
              this.peerConnection?.iceGatheringState === 'gathering' && 
              this.connectionState === 'new') {
            if (DEBUG) console.log('ICE gathering timeout - proceeding anyway');
            // Force proceeding with available candidates
            if (this.isInitiator && this.peerConnection?.localDescription) {
              this.sendSignalingMessage({
                type: 'offer',
                sessionId: this.sessionId,
                data: this.peerConnection.localDescription,
                timestamp: Date.now(),
              });
            }
          }
        }, ICE_GATHERING_TIMEOUT);
      }
    };
    
    // Monitor signaling state
    this.peerConnection.onsignalingstatechange = () => {
      if (DEBUG) console.log('Signaling state:', this.peerConnection?.signalingState);
    };
  }

  /**
   * Handle disconnection by attempting to reconnect
   */
  private handleDisconnect(): void {
    if (DEBUG) console.log('Handling disconnection - attempting to recover');
    // If we're disconnected but not failed, try to restart ICE
    if (this.peerConnection && this.connectionState !== 'failed') {
      try {
        // Try ICE restart if supported
        if (this.isInitiator) {
          this.createOffer(true); // true for ICE restart
        }
      } catch (error) {
        console.error('Error during disconnect recovery:', error);
        // If recovery fails, attempt full reconnect
        this.attemptReconnect();
      }
    }
  }
  
  /**
   * Handle ICE failure by attempting to use a TURN server directly
   */
  private handleICEFailure(): void {
    if (DEBUG) console.log('Handling ICE failure');
    
    // If ICE failed and we already tried reconnecting, try TURN-only configuration
    if (this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
      if (DEBUG) console.log('Using TURN-only configuration for next attempt');
      // Close existing connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Create new connection with TURN-only configuration
      const turnServers = DEFAULT_ICE_SERVERS.filter(server => 
        server.urls.toString().startsWith('turn:')
      );
      
      try {
        this.peerConnection = new RTCPeerConnection({
          iceServers: turnServers,
          iceTransportPolicy: 'relay', // Force TURN usage
          iceCandidatePoolSize: 5,
        });
        
        if (DEBUG) console.log('Created TURN-only peer connection', turnServers);
        
        // Set up event listeners
        this.setupPeerConnectionListeners();
        
        // Recreate data channel or wait for ondatachannel
        if (this.isInitiator) {
          this.createDataChannel();
          this.createOffer();
        } else {
          this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannelListeners();
          };
        }
      } catch (error) {
        console.error('Failed to create TURN-only connection:', error);
        this.updateConnectionState('failed');
      }
    } else {
      // If we've already tried TURN-only or haven't tried reconnecting yet,
      // attempt a standard reconnect
      this.attemptReconnect();
    }
  }
  
  /**
   * Start a heartbeat to keep the connection alive
   */
  private startHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.connectionState === 'connected' && this.dataChannel?.readyState === 'open') {
        this.sendDataChannelMessage(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      } else {
        clearInterval(this.pingInterval!);
        this.pingInterval = null;
      }
    }, 15000); // Send ping every 15 seconds
  }
  
  /**
   * Clear all timers and intervals
   */
  private clearAllTimers(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Create a data channel for communication
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;
    
    try {
      // Configure data channel for reliable file transfer
      const dataChannelOptions: RTCDataChannelInit = {
        ordered: true,           // Guarantee order
        maxRetransmits: 30,      // Maximum number of retransmission attempts
        maxPacketLifeTime: 5000  // Maximum packet lifetime in milliseconds
      };
      
      this.dataChannel = this.peerConnection.createDataChannel(
        `transfer-${this.sessionId}`, 
        dataChannelOptions
      );
      
      if (DEBUG) console.log('Data channel created');
      
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
  private async createOffer(iceRestart: boolean = false): Promise<void> {
    if (!this.peerConnection) return;

    try {
      // Create offer with appropriate options
      const offerOptions: RTCOfferOptions = {
        iceRestart: iceRestart, // Set to true for ICE restart if needed
      };
      
      const offer = await this.peerConnection.createOffer(offerOptions);
      
      // Add bandwidth and codec preferences if supported
      const modifiedOffer = this.enhanceOfferWithPreferences(offer);
      
      await this.peerConnection.setLocalDescription(modifiedOffer);
      
      // Wait briefly to collect some ICE candidates before sending the offer
      setTimeout(() => {
        if (this.peerConnection?.localDescription) {
          // Send the offer to the peer via signaling server
          this.sendSignalingMessage({
            type: 'offer',
            sessionId: this.sessionId,
            data: this.peerConnection.localDescription,
            timestamp: Date.now(),
          });
        }
        
        this.updateConnectionState('connecting');
      }, 1000);
    } catch (error) {
      console.error('Error creating offer:', error);
      this.updateConnectionState('failed');
    }
  }
  
  /**
   * Enhance the offer with bandwidth and codec preferences
   */
  private enhanceOfferWithPreferences(offer: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
    if (!offer.sdp) return offer;
    
    // Add bandwidth limitation and preferred codecs
    let sdp = offer.sdp;
    
    // Increase max bandwidth for reliable transfer
    sdp = sdp.replace(/b=AS:.*\r\n/g, '');
    sdp = sdp.replace(/a=mid:0\r\n/g, 'a=mid:0\r\nb=AS:1024\r\n'); // 1mbps
    
    // Prioritize reliable codecs if needed
    // This is just an example - actual codec preferences depend on use case
    
    return {
      ...offer,
      sdp: sdp
    };
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
   * Send a message via the data channel
   */
  private sendDataChannelMessage(message: string | ArrayBuffer | object): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready for sending message');
      return false;
    }
    
    try {
      // Convert message to the right type for sending
      if (typeof message === 'string') {
        this.dataChannel.send(message);
      } else if (message instanceof ArrayBuffer) {
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
  private handleDataChannelMessage(data: string | ArrayBuffer): void {
    // For text messages (control messages, metadata)
    if (typeof data === 'string' || data instanceof String) {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle different message types
        switch (message.type) {
          case 'file-metadata':
            this.handleFileMetadata(message.data);
            break;
            
          case 'transfer-complete':
            this.handleTransferComplete(message.data.size);
            break;
            
          case 'cancel':
            this.handleCancelTransfer(message.reason);
            break;
            
          case 'ping':
            // Respond to ping messages to keep connection alive
            this.sendDataChannelMessage(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          case 'test':
            // Handle connection test messages
            this.handleTestMessage(message);
            break;
            
          default:
            console.warn('Unknown data channel message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error, data);
      }
    } else {
      // Binary data - file chunk
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
    // Clear any existing polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // In a production app, this would use WebSockets or Server-Sent Events
    // For this demo, we use more aggressive polling
    let failedRequests = 0;
    let lastSeenTimestamp = 0;
    const MAX_FAILED_REQUESTS = 5;
    
    const pollSignalingServer = async () => {
      if (this.connectionState === 'closed' || this.connectionState === 'failed') {
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
        return;
      }
      
      try {
        if (DEBUG) console.log(`Polling signaling server for messages: ${this.shortCode}`);
        
        // Add a unique timestamp to prevent caching
        const cacheBuster = Date.now();
        const url = `${this.signalServer}?shortCode=${this.shortCode}&sessionId=${this.sessionId}&since=${lastSeenTimestamp}&_=${cacheBuster}`;
        
        const response = await fetch(url, {
          // Add cache-busting to prevent cached responses
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const messages = await response.json();
          failedRequests = 0; // Reset failed request counter
          
          if (messages && messages.length > 0) {
            if (DEBUG) console.log(`Received ${messages.length} messages from signaling server`);
            
            // Update last seen timestamp to the most recent message
            const latestMessage = messages.reduce(
              (latest: any, msg: any) => msg.timestamp > latest.timestamp ? msg : latest, 
              { timestamp: lastSeenTimestamp }
            );
            lastSeenTimestamp = latestMessage.timestamp;
            
            // Process each message
            for (const message of messages) {
              await this.handleSignalingMessage(message);
            }
          }
        } else {
          console.error(`Signaling server responded with status: ${response.status}`);
          failedRequests++;
          
          if (failedRequests >= MAX_FAILED_REQUESTS) {
            if (DEBUG) console.log('Maximum failed requests reached, attempting reconnect');
            // Check if we can direct connect before giving up
            this.tryDirectConnection();
            failedRequests = 0;
          }
        }
      } catch (error) {
        console.error('Error polling signaling server:', error);
        failedRequests++;
        
        if (failedRequests >= MAX_FAILED_REQUESTS) {
          if (DEBUG) console.log('Maximum failed requests reached (error), attempting reconnect');
          // Check if we can direct connect before giving up
          this.tryDirectConnection();
          failedRequests = 0;
        }
      }
      
      // Adjust polling interval based on connection state
      const pollingInterval = this.connectionState === 'connected' 
        ? POLLING_INTERVAL_CONNECTED
        : POLLING_INTERVAL_CONNECTING;
        
      if (!this.pollingInterval) {
        // Schedule next poll
        this.pollingInterval = setInterval(pollSignalingServer, pollingInterval);
      }
    };
    
    // Run the first poll immediately
    await pollSignalingServer();
  }

  /**
   * Try to establish a direct connection if signaling fails
   */
  private tryDirectConnection(): void {
    if (DEBUG) console.log('Attempting direct connection without signaling');
    
    if (this.isInitiator && this.peerConnection) {
      // For the initiator, create a new offer and try to connect directly
      this.createOffer(true);
    } else if (!this.isInitiator && this.peerConnection) {
      // For the receiver, wait for the offer or try to create a connection
      // This is more difficult without signaling, but we can try to be creative
      
      // Alternative approach: both sides could try to be initiators in a race condition,
      // but that gets complex and is beyond the scope of this implementation
      
      // For now, just notify that direct connection is being attempted
      this.updateConnectionState('connecting');
    }
  }

  /**
   * Handle messages from the signaling server
   */
  private async handleSignalingMessage(message: PeerMessage): Promise<void> {
    try {
      if (DEBUG) console.log('Received signaling message:', message.type);
      
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
          
        case 'ping':
          // Respond to ping with pong
          this.sendSignalingMessage({
            type: 'pong',
            sessionId: this.sessionId,
            data: { timestamp: Date.now() },
            timestamp: Date.now(),
          });
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

  /**
   * Test if the connection is ready by sending a test message
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Check if the data channel is ready
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        console.log('Data channel not ready for testing connection');
        return false;
      }
      
      // Generate small test data
      const testMessage = {
        type: 'test',
        data: 'connection-test',
        timestamp: Date.now()
      };
      
      // Store reference to avoid null checks later
      const dataChannel = this.dataChannel;
      
      return new Promise<boolean>((resolve) => {
        // Set up a one-time handler for test response
        const originalOnMessage = dataChannel.onmessage;
        
        // Set a timeout in case we don't get a response
        const timeout = setTimeout(() => {
          // Restore original message handler if dataChannel still exists
          if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.onmessage = originalOnMessage;
          }
          if (DEBUG) console.log('Test connection timed out');
          resolve(false);
        }, 5000);
        
        // Override the message handler temporarily
        dataChannel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'test-response') {
              clearTimeout(timeout);
              if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.onmessage = originalOnMessage;
              }
              if (DEBUG) console.log('Connection test successful!');
              this.updateConnectionState('connected');
              resolve(true);
              return;
            }
          } catch (e) {
            // Not a JSON message or not our test response,
            // pass to the original handler
          }
          
          // Call the original message handler for all other messages
          if (originalOnMessage) {
            originalOnMessage.call(dataChannel, event);
          }
        };
        
        // Send the test message
        if (DEBUG) console.log('Sending connection test message');
        this.sendDataChannelMessage(testMessage);
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }

  /**
   * Handle a test message by sending a response
   */
  private handleTestMessage(message: any): void {
    if (DEBUG) console.log('Received test message, sending response');
    this.sendDataChannelMessage(JSON.stringify({
      type: 'test-response',
      data: 'connection-test-confirmed',
      timestamp: Date.now()
    }));
  }
} 