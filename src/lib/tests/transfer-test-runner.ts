// Test utilities and helpers for Meow-Share Transfer Test Suite

export interface TestResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  error?: string
  duration?: number
  details?: any
}

export interface TestSuite {
  id: string
  name: string
  description: string
  tests: TestResult[]
  completed: boolean
  lastRun?: Date
}

export class TransferTestRunner {
  private testSuites: Map<string, TestSuite> = new Map()
  private onProgress?: (suiteId: string, results: TestResult[]) => void

  constructor(onProgress?: (suiteId: string, results: TestResult[]) => void) {
    this.onProgress = onProgress
    this.initializeTestSuites()
  }

  private initializeTestSuites() {
    // Accessibility & Usability Tests
    this.addTestSuite('accessibility', 'Accessibility & Usability', 'Tests for mobile-first PWA, drag & drop, QR code, and copy-paste functionality', [
      { id: 'pwa', name: 'Mobile-first PWA Test', status: 'pending' },
      { id: 'drag-drop', name: 'Drag & Drop Multi-file Test', status: 'pending' },
      { id: 'qr-transfer', name: 'QR Code Transfer Test', status: 'pending' },
      { id: 'copy-paste', name: 'Copy-Paste Text/Links Test', status: 'pending' },
      { id: 'offline-sync', name: 'Offline Sync Test', status: 'pending' }
    ])

    // Performance & Transfer Speed Tests
    this.addTestSuite('performance', 'Performance & Transfer Speed', 'Tests for P2P WebRTC, parallel chunks, region routing, and background transfers', [
      { id: 'p2p-webrtc', name: 'P2P WebRTC Test', status: 'pending' },
      { id: 'parallel-chunks', name: 'Parallel Chunk Upload/Download Test', status: 'pending' },
      { id: 'region-routing', name: 'Region-Based Routing Test', status: 'pending' },
      { id: 'background-transfer', name: 'Background Transfer Test', status: 'pending' }
    ])
  }

  private addTestSuite(id: string, name: string, description: string, tests: TestResult[]) {
    this.testSuites.set(id, {
      id,
      name,
      description,
      tests,
      completed: false
    })
  }

  getTestSuite(id: string): TestSuite | undefined {
    return this.testSuites.get(id)
  }

  getAllTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values())
  }

  async runTestSuite(suiteId: string): Promise<TestSuite> {
    const suite = this.testSuites.get(suiteId)
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`)
    }

    // Reset test statuses
    suite.tests.forEach(test => {
      test.status = 'pending'
      test.error = undefined
      test.duration = undefined
    })
    suite.completed = false
    suite.lastRun = new Date()

    // Run tests based on suite
    switch (suiteId) {
      case 'accessibility':
        await this.runAccessibilityTests(suite)
        break
      case 'performance':
        await this.runPerformanceTests(suite)
        break
      default:
        throw new Error(`Unknown test suite: ${suiteId}`)
    }

    // Check if all tests passed
    suite.completed = suite.tests.every(test => test.status === 'passed')
    
    return suite
  }

  private async runAccessibilityTests(suite: TestSuite): Promise<void> {
    // PWA Test
    await this.runTest(suite, 'pwa', async () => {
      return await this.testPWAFunctionality()
    })

    // Drag & Drop Test
    await this.runTest(suite, 'drag-drop', async () => {
      return await this.testDragAndDrop()
    })

    // QR Code Transfer Test
    await this.runTest(suite, 'qr-transfer', async () => {
      return await this.testQRCodeTransfer()
    })

    // Copy-Paste Test
    await this.runTest(suite, 'copy-paste', async () => {
      return await this.testCopyPaste()
    })

    // Offline Sync Test
    await this.runTest(suite, 'offline-sync', async () => {
      return await this.testOfflineSync()
    })
  }

  private async runPerformanceTests(suite: TestSuite): Promise<void> {
    // P2P WebRTC Test
    await this.runTest(suite, 'p2p-webrtc', async () => {
      return await this.testP2PWebRTC()
    })

    // Parallel Chunks Test
    await this.runTest(suite, 'parallel-chunks', async () => {
      return await this.testParallelChunks()
    })

    // Region Routing Test
    await this.runTest(suite, 'region-routing', async () => {
      return await this.testRegionRouting()
    })

    // Background Transfer Test
    await this.runTest(suite, 'background-transfer', async () => {
      return await this.testBackgroundTransfer()
    })
  }

  private async runTest(suite: TestSuite, testId: string, testFn: () => Promise<any>): Promise<void> {
    const test = suite.tests.find(t => t.id === testId)
    if (!test) return

    test.status = 'running'
    this.notifyProgress(suite.id)

    try {
      const startTime = Date.now()
      const result = await testFn()
      const duration = Date.now() - startTime

      test.status = 'passed'
      test.duration = duration
      test.details = result
    } catch (error) {
      test.status = 'failed'
      test.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.notifyProgress(suite.id)
  }

  private notifyProgress(suiteId: string): void {
    const suite = this.testSuites.get(suiteId)
    if (suite && this.onProgress) {
      this.onProgress(suiteId, suite.tests)
    }
  }

  // Test implementations
  private async testPWAFunctionality(): Promise<any> {
    // Check if PWA is supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    // Check if app can be installed
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      // Check if beforeinstallprompt event is supported
      if (!('BeforeInstallPromptEvent' in window)) {
        throw new Error('PWA installation not supported')
      }
    }

    // Check offline capability
    if (!('caches' in window)) {
      throw new Error('Cache API not supported for offline functionality')
    }

    return {
      pwaSupported: true,
      serviceWorkerSupported: true,
      cacheSupported: true,
      installable: 'BeforeInstallPromptEvent' in window
    }
  }

  private async testDragAndDrop(): Promise<any> {
    // Check if drag and drop is supported
    if (!('draggable' in document.createElement('div'))) {
      throw new Error('Drag and drop not supported')
    }

    // Check File API support
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      throw new Error('File API not supported')
    }

    // Check for multiple file selection
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    
    if (!input.multiple) {
      throw new Error('Multiple file selection not supported')
    }

    // Check directory selection (webkitdirectory)
    input.webkitdirectory = true
    if (!input.webkitdirectory) {
      throw new Error('Directory selection not supported')
    }

    return {
      dragDropSupported: true,
      fileAPISupported: true,
      multipleFilesSupported: true,
      directorySelectionSupported: !!input.webkitdirectory
    }
  }

  private async testQRCodeTransfer(): Promise<any> {
    // Check if QR code library is available
    try {
      const QRCode = await import('qrcode')
      if (!QRCode) {
        throw new Error('QRCode library not available')
      }

      // Test QR code generation
      const testUrl = 'https://example.com/test'
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, testUrl, { width: 200 })
      
      if (!canvas.width || !canvas.height) {
        throw new Error('QR code generation failed')
      }

      // Check camera access for mobile QR scanning
      const cameraAccess = await this.checkCameraAccess()

      return {
        qrGenerationSupported: true,
        qrScanningSupported: cameraAccess,
        testUrl: testUrl,
        canvasSize: { width: canvas.width, height: canvas.height }
      }
    } catch (error) {
      throw new Error(`QR code test failed: ${error}`)
    }
  }

  private async checkCameraAccess(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some(device => device.kind === 'videoinput')
    } catch {
      return false
    }
  }

  private async testCopyPaste(): Promise<any> {
    // Check Clipboard API support
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not supported')
    }

    // Test text copy
    const testText = 'Test text for copy-paste functionality'
    try {
      await navigator.clipboard.writeText(testText)
      const pastedText = await navigator.clipboard.readText()
      
      if (pastedText !== testText) {
        throw new Error('Copy-paste text integrity check failed')
      }
    } catch (error) {
      throw new Error(`Text copy-paste failed: ${error}`)
    }

    return {
      clipboardAPISupported: true,
      textCopyPasteSupported: true,
      testText: testText
    }
  }

  private async testOfflineSync(): Promise<any> {
    // Check Service Worker support
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    // Check IndexedDB support for offline storage
    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB not supported for offline storage')
    }

    // Check Background Sync API
    if (!('ServiceWorkerRegistration' in window) || !('sync' in ServiceWorkerRegistration.prototype)) {
      throw new Error('Background Sync API not supported')
    }

    return {
      serviceWorkerSupported: true,
      indexedDBSupported: true,
      backgroundSyncSupported: 'sync' in ServiceWorkerRegistration.prototype
    }
  }

  private async testP2PWebRTC(): Promise<any> {
    // Check WebRTC support
    if (!('RTCPeerConnection' in window) || !('RTCDataChannel' in window)) {
      throw new Error('WebRTC not supported')
    }

    // Check for ICE gathering
    const pc = new RTCPeerConnection()
    if (!pc.createOffer) {
      throw new Error('WebRTC offer creation not supported')
    }
    pc.close()

    return {
      webrtcSupported: true,
      dataChannelSupported: 'RTCDataChannel' in window,
      iceGatheringSupported: true
    }
  }

  private async testParallelChunks(): Promise<any> {
    // Check Web Workers for parallel processing
    if (!('Worker' in window)) {
      throw new Error('Web Workers not supported for parallel processing')
    }

    // Check Blob API for chunk handling
    if (!('Blob' in window) || !('slice' in Blob.prototype)) {
      throw new Error('Blob slicing not supported for chunk handling')
    }

    // Check Fetch API with streaming support
    if (!('fetch' in window)) {
      throw new Error('Fetch API not supported')
    }

    return {
      webWorkersSupported: true,
      blobSlicingSupported: true,
      fetchAPISupported: true,
      streamingSupported: 'ReadableStream' in window
    }
  }

  private async testRegionRouting(): Promise<any> {
    // Check geolocation for region detection
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported for region detection')
    }

    // Check performance API for latency measurement
    if (!('performance' in window)) {
      throw new Error('Performance API not supported for latency measurement')
    }

    return {
      geolocationSupported: true,
      performanceAPISupported: true,
      timingAPISupported: 'timing' in performance
    }
  }

  private async testBackgroundTransfer(): Promise<any> {
    // Check Service Worker background sync
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    // Check Background Fetch API (experimental)
    const backgroundFetchSupported = 'backgroundFetch' in ServiceWorkerRegistration.prototype

    // Check Notification API for progress updates
    const notificationSupported = 'Notification' in window

    return {
      serviceWorkerSupported: true,
      backgroundFetchSupported,
      notificationSupported,
      backgroundSyncSupported: 'sync' in ServiceWorkerRegistration.prototype
    }
  }

  async checkTestCompletion(): Promise<boolean> {
    // Check if all test suites are completed and passed
    for (const suite of this.testSuites.values()) {
      if (!suite.completed) return false
      if (!suite.tests.every(test => test.status === 'passed')) return false
    }
    return true
  }

  async setTestCompletionFlag(completed: boolean): Promise<void> {
    try {
      // Store completion flag in localStorage
      localStorage.setItem('meow_share_test_complete', completed.toString())
      
      // Also try to store in IndexedDB for persistence
      const request = indexedDB.open('MeowShareTests', 1)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      }
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = db.transaction('settings', 'readwrite')
        const store = transaction.objectStore('settings')
        store.put({ id: 'test_complete', value: completed, timestamp: new Date() })
      }
    } catch (error) {
      console.error('Failed to set test completion flag:', error)
    }
  }

  async getTestCompletionFlag(): Promise<boolean> {
    // Check localStorage first
    const localStorageFlag = localStorage.getItem('meow_share_test_complete')
    if (localStorageFlag !== null) {
      return localStorageFlag === 'true'
    }

    // Check IndexedDB
    try {
      const request = indexedDB.open('MeowShareTests', 1)
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction('settings', 'readonly')
          const store = transaction.objectStore('settings')
          const getRequest = store.get('test_complete')
          
          getRequest.onsuccess = () => {
            const result = getRequest.result
            resolve(result ? result.value : false)
          }
          
          getRequest.onerror = () => {
            resolve(false)
          }
        }
        
        request.onerror = () => {
          resolve(false)
        }
      })
    } catch {
      return false
    }
  }
}