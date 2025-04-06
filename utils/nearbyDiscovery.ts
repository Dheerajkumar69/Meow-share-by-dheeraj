/**
 * Nearby Device Discovery using Web Bluetooth
 * This utility handles discovering nearby devices that have the website open
 */

// Add Web Bluetooth types
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }
  
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    connected: boolean;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    value?: DataView;
  }
  
  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }
}

// UUID for our custom service - this needs to be consistent across all clients
const SERVICE_UUID = '75667777-8888-9999-0000-555566667777';
const CHARACTERISTIC_UUID = '75667777-8888-9999-1111-555566667777';

// Device information type
export interface NearbyDevice {
  id: string;
  name: string;
  deviceId: string;
  rssi?: number; // Signal strength
  distance?: number; // Estimated distance in meters
}

// Status of the discovery process
export type DiscoveryStatus = 
  'idle' | 
  'scanning' | 
  'advertising' | 
  'connected' | 
  'error';

// Callbacks for the discovery process
export interface DiscoveryCallbacks {
  onStatusChange: (status: DiscoveryStatus, error?: string) => void;
  onDeviceFound: (device: NearbyDevice) => void;
  onDeviceDisconnected: (deviceId: string) => void;
}

/**
 * Class to handle nearby device discovery
 */
export class NearbyDiscovery {
  private status: DiscoveryStatus = 'idle';
  private discoveredDevices: Map<string, NearbyDevice> = new Map();
  private callbacks: DiscoveryCallbacks;
  private deviceName: string;
  private deviceId: string;
  private bluetoothDevice: BluetoothDevice | null = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  
  constructor(
    options: {
      callbacks: DiscoveryCallbacks;
      deviceName?: string;
      deviceId?: string;
    }
  ) {
    this.callbacks = options.callbacks;
    // Generate a random name if not provided
    this.deviceName = options.deviceName || `Device-${Math.floor(Math.random() * 10000)}`;
    // Generate a random ID if not provided
    this.deviceId = options.deviceId || `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Check if Web Bluetooth is supported in this browser
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 
           navigator.bluetooth !== undefined;
  }
  
  /**
   * Start scanning for nearby devices
   */
  public async startScanning(): Promise<void> {
    if (!this.isSupported()) {
      this.updateStatus('error', 'Web Bluetooth is not supported in this browser');
      return;
    }
    
    try {
      this.updateStatus('scanning');
      
      // Request device with our service UUID
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth API not available');
      }
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID]
      });
      
      if (!device) {
        throw new Error('No device selected');
      }
      
      this.bluetoothDevice = device;
      
      // Add event listener for disconnection
      this.bluetoothDevice.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));
      
      // Connect to the GATT server
      if (!this.bluetoothDevice.gatt) {
        throw new Error('GATT server not available on this device');
      }
      
      this.gattServer = await this.bluetoothDevice.gatt.connect();
      
      if (!this.gattServer) {
        throw new Error('Failed to connect to GATT server');
      }
      
      // Get the primary service
      const service = await this.gattServer.getPrimaryService(SERVICE_UUID);
      
      // Get the characteristic
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      
      // Read the value to get device info
      const value = await characteristic.readValue();
      const deviceInfo = this.decodeDeviceInfo(value);
      
      // Add to discovered devices
      this.discoveredDevices.set(deviceInfo.id, {
        ...deviceInfo,
        deviceId: this.bluetoothDevice.id
      });
      
      // Notify callback
      this.callbacks.onDeviceFound(deviceInfo);
      
      // Subscribe to notifications for new devices
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', 
        (event: Event) => this.handleCharacteristicValueChanged(event));
      
      this.updateStatus('connected');
    } catch (error) {
      console.error('Error scanning for devices:', error);
      this.updateStatus('error', (error as Error).message);
    }
  }
  
  /**
   * Start advertising this device so others can discover it
   */
  public async startAdvertising(): Promise<void> {
    if (!this.isSupported()) {
      this.updateStatus('error', 'Web Bluetooth is not supported in this browser');
      return;
    }
    
    try {
      this.updateStatus('advertising');
      // Not fully implementable with current Web Bluetooth API
      // This would require a polyfill or backend support
      
      // This is just a placeholder as Web Bluetooth doesn't actually
      // support advertising directly from the browser yet
      console.log('Started advertising as:', this.deviceName);
      
      // In a real implementation, we would need:
      // 1. A server that relays discovery information
      // 2. Or a native app with Bluetooth peripheral capabilities
      // 3. Or wait for Web Bluetooth peripheral mode to be standardized
      
      // For now, just update status
      // In a real implementation, this would involve creating a GATT server
      setTimeout(() => {
        this.updateStatus('idle');
        alert('Note: Full Bluetooth advertising requires additional capabilities not available in all browsers. For a complete implementation, consider using a native app or backend service.');
      }, 2000);
    } catch (error) {
      console.error('Error advertising device:', error);
      this.updateStatus('error', (error as Error).message);
    }
  }
  
  /**
   * Stop scanning or advertising
   */
  public stop(): void {
    if (this.gattServer && this.gattServer.connected) {
      this.gattServer.disconnect();
    }
    
    this.bluetoothDevice = null;
    this.gattServer = null;
    this.updateStatus('idle');
  }
  
  /**
   * Connect to a specific device
   */
  public async connectToDevice(deviceId: string): Promise<boolean> {
    const device = this.discoveredDevices.get(deviceId);
    
    if (!device) {
      console.error('Device not found:', deviceId);
      return false;
    }
    
    // In a real implementation, this would establish a connection
    // For demo purposes, just simulate a connection
    console.log('Connected to device:', device.name);
    return true;
  }
  
  /**
   * Get all discovered devices
   */
  public getDiscoveredDevices(): NearbyDevice[] {
    return Array.from(this.discoveredDevices.values());
  }
  
  /**
   * Get the current status
   */
  public getStatus(): DiscoveryStatus {
    return this.status;
  }
  
  /**
   * Handle disconnection event
   */
  private handleDisconnection(event: Event): void {
    // Fix for TS error - safely cast with type checking using a more robust approach
    const target = event.target;
    
    // Type guard function to check if it's a BluetoothDevice
    const isBluetoothDevice = (obj: any): obj is BluetoothDevice => {
      return obj !== null && 
             typeof obj === 'object' && 
             'id' in obj &&
             typeof obj.id === 'string';
    };
    
    if (!target || !isBluetoothDevice(target)) {
      console.error('Invalid device in disconnection event');
      return;
    }
    
    // Now safe to use as the correct type
    const device = target;
    
    // Find the device in our map and remove it
    Array.from(this.discoveredDevices.entries()).forEach(([id, discoveredDevice]) => {
      if (discoveredDevice.deviceId === device.id) {
        // Remove from map
        this.discoveredDevices.delete(id);
        
        // Notify callback
        this.callbacks.onDeviceDisconnected(id);
      }
    });
    
    this.updateStatus('idle');
  }
  
  /**
   * Handle characteristic value changed event
   */
  private handleCharacteristicValueChanged(event: Event): void {
    // Fix for TS error - safely cast with type checking using a more robust approach
    const target = event.target;
    
    // Type guard function to check if it's a BluetoothRemoteGATTCharacteristic
    const isGattCharacteristic = (obj: any): obj is BluetoothRemoteGATTCharacteristic => {
      return obj !== null && 
             typeof obj === 'object' && 
             'value' in obj &&
             typeof obj.readValue === 'function' &&
             typeof obj.startNotifications === 'function';
    };
    
    if (!target || !isGattCharacteristic(target)) {
      console.error('Invalid characteristic in value changed event');
      return;
    }
    
    // Now safe to use as the correct type
    const characteristic = target;
    const value = characteristic.value;
    
    if (!value) return;
    
    // Decode the device info
    const deviceInfo = this.decodeDeviceInfo(value);
    
    // Add to discovered devices
    this.discoveredDevices.set(deviceInfo.id, {
      ...deviceInfo,
      deviceId: 'unknown' // We don't have the device ID in this context
    });
    
    // Notify callback
    this.callbacks.onDeviceFound(deviceInfo);
  }
  
  /**
   * Update the status and notify callback
   */
  private updateStatus(status: DiscoveryStatus, error?: string): void {
    this.status = status;
    this.callbacks.onStatusChange(status, error);
  }
  
  /**
   * Decode device info from a DataView
   */
  private decodeDeviceInfo(value: DataView): NearbyDevice {
    // In a real implementation, this would parse the data from the characteristic
    // For demo purposes, just return a placeholder
    return {
      id: this.deviceId,
      name: this.deviceName,
      deviceId: 'unknown',
      rssi: -50,
      distance: 2.5
    };
  }
} 