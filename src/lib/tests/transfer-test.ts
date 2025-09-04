// Test utilities for Meow-Share Transfer Test Suite

export interface TestResult {
  id: string
  name: string
  passed: boolean
  message?: string
  timestamp: Date
  details?: any
}

export interface TestSuite {
  id: string
  name: string
  tests: TestResult[]
  completed: boolean
  startedAt?: Date
  completedAt?: Date
}

export class TransferTestRunner {
  private static instance: TransferTestRunner
  private testSuites: Map<string, TestSuite> = new Map()
  private testCompletionFlag: boolean = false

  private constructor() {
    this.loadTestState()
  }

  static getInstance(): TransferTestRunner {
    if (!TransferTestRunner.instance) {
      TransferTestRunner.instance = new TransferTestRunner()
    }
    return TransferTestRunner.instance
  }

  private loadTestState() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meowshare_test_state')
      if (saved) {
        try {
          const state = JSON.parse(saved)
          this.testSuites = new Map(state.testSuites || [])
          this.testCompletionFlag = state.testCompletionFlag || false
        } catch (error) {
          console.warn('Failed to load test state:', error)
        }
      }
    }
  }

  private saveTestState() {
    if (typeof window !== 'undefined') {
      const state = {
        testSuites: Array.from(this.testSuites.entries()),
        testCompletionFlag: this.testCompletionFlag
      }
      localStorage.setItem('meowshare_test_state', JSON.stringify(state))
    }
  }

  createTestSuite(id: string, name: string): TestSuite {
    const suite: TestSuite = {
      id,
      name,
      tests: [],
      completed: false,
      startedAt: new Date()
    }
    this.testSuites.set(id, suite)
    this.saveTestState()
    return suite
  }

  addTestResult(suiteId: string, test: Omit<TestResult, 'timestamp'>): void {
    const suite = this.testSuites.get(suiteId)
    if (!suite) {
      console.warn(`Test suite ${suiteId} not found`)
      return
    }

    const testResult: TestResult = {
      ...test,
      timestamp: new Date()
    }

    suite.tests.push(testResult)
    this.checkSuiteCompletion(suiteId)
    this.saveTestState()
  }

  private checkSuiteCompletion(suiteId: string): void {
    const suite = this.testSuites.get(suiteId)
    if (!suite) return

    const allTestsPassed = suite.tests.every(test => test.passed)
    const requiredTests = this.getRequiredTestsForSuite(suiteId)
    const completedRequiredTests = suite.tests.filter(
      test => requiredTests.includes(test.id) && test.passed
    ).length

    if (allTestsPassed && completedRequiredTests === requiredTests.length) {
      suite.completed = true
      suite.completedAt = new Date()
      this.checkOverallCompletion()
    }
  }

  private getRequiredTestsForSuite(suiteId: string): string[] {
    const requiredTests: Record<string, string[]> = {
      'accessibility': [
        'mobile-pwa',
        'drag-drop-multi',
        'qr-transfer',
        'copy-paste',
        'offline-sync'
      ],
      'performance': [
        'p2p-webrtc',
        'parallel-chunks',
        'region-routing',
        'background-transfer'
      ]
    }
    return requiredTests[suiteId] || []
  }

  private checkOverallCompletion(): void {
    const allSuites = Array.from(this.testSuites.values())
    const allCompleted = allSuites.every(suite => suite.completed)
    
    if (allCompleted && !this.testCompletionFlag) {
      this.testCompletionFlag = true
      this.saveTestState()
      this.onAllTestsCompleted()
    }
  }

  private onAllTestsCompleted(): void {
    console.log('🎉 All Meow-Share Transfer Tests Passed!')
    console.log('Meow-Share v1.0 Ready ✅')
    
    // Dispatch completion event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meowshare-tests-completed'))
    }
  }

  getTestSuite(suiteId: string): TestSuite | undefined {
    return this.testSuites.get(suiteId)
  }

  getAllTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values())
  }

  isTestComplete(): boolean {
    return this.testCompletionFlag
  }

  resetTests(): void {
    this.testSuites.clear()
    this.testCompletionFlag = false
    this.saveTestState()
  }

  // Utility functions for common test scenarios
  async generateTestFile(sizeInBytes: number): Promise<File> {
    const buffer = new Uint8Array(sizeInBytes)
    crypto.getRandomValues(buffer)
    
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    return new File([blob], `test-file-${sizeInBytes}.bin`, {
      type: 'application/octet-stream'
    })
  }

  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async simulateNetworkCondition(type: 'offline' | 'slow' | 'unstable'): Promise<void> {
    if (typeof window === 'undefined') return

    // This would integrate with service worker for network simulation
    const message = {
      type: 'SIMULATE_NETWORK',
      condition: type
    }
    
    navigator.serviceWorker?.controller?.postMessage(message)
  }

  async checkPWACapabilities(): Promise<{
    isInstallable: boolean
    isInstalled: boolean
    isStandalone: boolean
  }> {
    if (typeof window === 'undefined') {
      return { isInstallable: false, isInstalled: false, isStandalone: false }
    }

    return {
      isInstallable: 'BeforeInstallPromptEvent' in window,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isStandalone: window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches
    }
  }
}

// Export singleton instance
export const testRunner = TransferTestRunner.getInstance()

// Test result helper functions
export function createTestResult(
  id: string,
  name: string,
  passed: boolean,
  message?: string,
  details?: any
): Omit<TestResult, 'timestamp'> {
  return { id, name, passed, message, details }
}

// Network simulation utilities
export class NetworkSimulator {
  static async simulateLatency(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async simulatePacketLoss(lossRate: number): Promise<boolean> {
    return Math.random() < lossRate
  }

  static async simulateBandwidth(kbps: number, dataSize: number): Promise<void> {
    const transferTime = (dataSize * 8) / (kbps * 1000) // Convert to seconds
    await this.simulateLatency(transferTime * 1000)
  }
}

// File integrity utilities
export class FileIntegrityChecker {
  static async verifyFileIntegrity(originalFile: File, downloadedFile: File): Promise<{
    matches: boolean
    originalHash: string
    downloadedHash: string
  }> {
    const [originalHash, downloadedHash] = await Promise.all([
      testRunner.calculateFileHash(originalFile),
      testRunner.calculateFileHash(downloadedFile)
    ])

    return {
      matches: originalHash === downloadedHash,
      originalHash,
      downloadedHash
    }
  }

  static async generateLargeTestFile(sizeMB: number): Promise<File> {
    const sizeBytes = sizeMB * 1024 * 1024
    return await testRunner.generateTestFile(sizeBytes)
  }
}