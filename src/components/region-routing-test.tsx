'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Globe, 
  MapPin, 
  Zap, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Network,
  Server,
  Wifi,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface RegionServer {
  id: string
  name: string
  location: string
  countryCode: string
  latency: number
  status: 'online' | 'offline' | 'slow'
  load: number // 0-100 percentage
  lastChecked: Date
}

interface RoutingTest {
  id: string
  sourceRegion: string
  targetRegion: string
  directLatency: number
  routedLatency: number
  improvement: number
  status: 'pending' | 'testing' | 'completed' | 'failed'
  timestamp: Date
  path: string[]
}

interface SpeedTest {
  id: string
  region: string
  downloadSpeed: number // Mbps
  uploadSpeed: number // Mbps
  latency: number // ms
  jitter: number // ms
  packetLoss: number // percentage
  timestamp: Date
}

export function RegionRoutingTest() {
  const [servers, setServers] = useState<RegionServer[]>([])
  const [routingTests, setRoutingTests] = useState<RoutingTest[]>([])
  const [speedTests, setSpeedTests] = useState<SpeedTest[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('us-east')
  const [autoOptimize, setAutoOptimize] = useState(true)
  const [globalStats, setGlobalStats] = useState({
    averageLatency: 0,
    averageImprovement: 0,
    activeServers: 0,
    totalTests: 0
  })

  const { toast } = useToast()

  // Region definitions
  const regions = [
    { id: 'us-east', name: 'US East', location: 'Virginia, USA', countryCode: 'US' },
    { id: 'us-west', name: 'US West', location: 'California, USA', countryCode: 'US' },
    { id: 'eu-central', name: 'EU Central', location: 'Frankfurt, Germany', countryCode: 'DE' },
    { id: 'eu-west', name: 'EU West', location: 'London, UK', countryCode: 'GB' },
    { id: 'asia-south', name: 'Asia South', location: 'Mumbai, India', countryCode: 'IN' },
    { id: 'asia-east', name: 'Asia East', location: 'Singapore', countryCode: 'SG' },
    { id: 'australia', name: 'Australia', location: 'Sydney, Australia', countryCode: 'AU' },
    { id: 'south-america', name: 'South America', location: 'São Paulo, Brazil', countryCode: 'BR' }
  ]

  useEffect(() => {
    // Initialize servers
    const initialServers: RegionServer[] = regions.map(region => ({
      id: region.id,
      name: region.name,
      location: region.location,
      countryCode: region.countryCode,
      latency: Math.floor(Math.random() * 200) + 20, // 20-220ms
      status: Math.random() < 0.1 ? 'offline' : Math.random() < 0.2 ? 'slow' : 'online',
      load: Math.floor(Math.random() * 100),
      lastChecked: new Date()
    }))
    setServers(initialServers)
  }, [])

  const measureLatency = async (targetRegion: string): Promise<number> => {
    // Simulate latency measurement
    const baseLatency = {
      'us-east': 50,
      'us-west': 80,
      'eu-central': 120,
      'eu-west': 100,
      'asia-south': 200,
      'asia-east': 180,
      'australia': 250,
      'south-america': 150
    }[targetRegion] || 100

    // Add some randomness
    return baseLatency + Math.floor(Math.random() * 40) - 20
  }

  const runRoutingTest = async (sourceRegion: string, targetRegion: string) => {
    const testId = Math.random().toString(36).substr(2, 9)
    
    const test: RoutingTest = {
      id: testId,
      sourceRegion,
      targetRegion,
      directLatency: 0,
      routedLatency: 0,
      improvement: 0,
      status: 'testing',
      timestamp: new Date(),
      path: []
    }

    setRoutingTests(prev => [test, ...prev])

    try {
      // Measure direct latency
      const directLatency = await measureLatency(targetRegion)
      
      // Simulate routing through optimal path
      const optimalPath = calculateOptimalPath(sourceRegion, targetRegion)
      let routedLatency = 0
      
      for (const hop of optimalPath) {
        routedLatency += await measureLatency(hop)
      }
      
      // Calculate improvement
      const improvement = ((directLatency - routedLatency) / directLatency) * 100
      
      const completedTest: RoutingTest = {
        ...test,
        directLatency,
        routedLatency,
        improvement,
        status: 'completed',
        path: optimalPath
      }

      setRoutingTests(prev => 
        prev.map(t => t.id === testId ? completedTest : t)
      )

      // Update global stats
      const allCompletedTests = routingTests.filter(t => t.status === 'completed')
      const avgLatency = allCompletedTests.reduce((sum, t) => sum + t.routedLatency, 0) / allCompletedTests.length
      const avgImprovement = allCompletedTests.reduce((sum, t) => sum + t.improvement, 0) / allCompletedTests.length
      
      setGlobalStats(prev => ({
        ...prev,
        averageLatency: avgLatency,
        averageImprovement: avgImprovement,
        totalTests: prev.totalTests + 1
      }))

    } catch (error) {
      setRoutingTests(prev => 
        prev.map(t => t.id === testId ? { ...t, status: 'failed' } : t)
      )
    }
  }

  const calculateOptimalPath = (source: string, target: string): string[] => {
    // Simplified path calculation - in reality this would be more complex
    const paths: Record<string, string[]> = {
      'us-east-us-west': ['us-west'],
      'us-east-eu-central': ['eu-central'],
      'us-east-asia-south': ['eu-central', 'asia-south'],
      'us-east-australia': ['asia-east', 'australia'],
      'eu-central-asia-south': ['asia-south'],
      'eu-central-asia-east': ['asia-east'],
      'asia-south-australia': ['asia-east', 'australia']
    }

    const directPath = `${source}-${target}`
    const reversePath = `${target}-${source}`
    
    return paths[directPath] || paths[reversePath] || [target]
  }

  const runSpeedTest = async (region: string) => {
    const testId = Math.random().toString(36).substr(2, 9)
    
    const server = servers.find(s => s.id === region)
    if (!server || server.status === 'offline') return

    try {
      // Simulate speed test
      const downloadSpeed = Math.random() * 900 + 100 // 100-1000 Mbps
      const uploadSpeed = downloadSpeed * 0.8 // 80% of download speed
      const latency = server.latency + Math.floor(Math.random() * 20) - 10
      const jitter = Math.floor(Math.random() * 10) // 0-10ms
      const packetLoss = Math.random() * 2 // 0-2%

      const speedTest: SpeedTest = {
        id: testId,
        region,
        downloadSpeed,
        uploadSpeed,
        latency,
        jitter,
        packetLoss,
        timestamp: new Date()
      }

      setSpeedTests(prev => [speedTest, ...prev])

      toast({
        title: "Speed Test Complete",
        description: `${server.name}: ${downloadSpeed.toFixed(1)} Mbps down, ${uploadSpeed.toFixed(1)} Mbps up`,
      })
    } catch (error) {
      toast({
        title: "Speed Test Failed",
        description: `Could not complete speed test for ${region}`,
        variant: "destructive",
      })
    }
  }

  const runComprehensiveTest = async () => {
    setIsTesting(true)
    
    try {
      // Test routing from selected region to all other regions
      const testPromises = regions
        .filter(r => r.id !== selectedRegion)
        .map(region => runRoutingTest(selectedRegion, region.id))
      
      await Promise.all(testPromises)
      
      // Run speed tests on a few key regions
      const speedTestRegions = ['us-east', 'eu-central', 'asia-south', 'australia']
      await Promise.all(speedTestRegions.map(region => runSpeedTest(region)))
      
      toast({
        title: "Comprehensive Test Complete",
        description: "Routing and speed tests completed successfully.",
      })
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Some tests failed to complete.",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const optimizeRouting = () => {
    // Simulate routing optimization
    const optimizedServers = servers.map(server => ({
      ...server,
      latency: Math.max(20, server.latency - Math.floor(Math.random() * 30)), // Reduce latency
      load: Math.max(0, server.load - Math.floor(Math.random() * 20)) // Reduce load
    }))
    
    setServers(optimizedServers)
    
    toast({
      title: "Routing Optimized",
      description: "Server routes have been optimized for better performance.",
    })
  }

  const refreshServerStatus = () => {
    const updatedServers = servers.map(server => ({
      ...server,
      latency: Math.floor(Math.random() * 200) + 20,
      status: Math.random() < 0.1 ? 'offline' : Math.random() < 0.2 ? 'slow' : 'online',
      load: Math.floor(Math.random() * 100),
      lastChecked: new Date()
    }))
    
    setServers(updatedServers)
    
    // Update active servers count
    const activeCount = updatedServers.filter(s => s.status === 'online').length
    setGlobalStats(prev => ({ ...prev, activeServers: activeCount }))
    
    toast({
      title: "Server Status Refreshed",
      description: "Server latency and status updated.",
    })
  }

  const formatLatency = (latency: number) => {
    return `${latency}ms`
  }

  const formatSpeed = (speed: number) => {
    return `${speed.toFixed(1)} Mbps`
  }

  const getServerStatusIcon = (status: RegionServer['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'slow':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getImprovementColor = (improvement: number) => {
    if (improvement > 20) return 'text-green-600'
    if (improvement > 0) return 'text-blue-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Region-Based Routing Test
          </CardTitle>
          <CardDescription>
            Test region-based routing optimization and global server performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Region</label>
              <select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name} ({region.location})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Auto Optimization</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-optimize"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                />
                <label htmlFor="auto-optimize" className="text-sm">
                  Automatically optimize routes
                </label>
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={runComprehensiveTest} 
              disabled={isTesting}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Comprehensive Test
                </>
              )}
            </Button>
            <Button onClick={optimizeRouting} variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Optimize Routing
            </Button>
            <Button onClick={refreshServerStatus} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          {/* Global Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{globalStats.activeServers}</div>
              <div className="text-sm text-muted-foreground">Active Servers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{globalStats.averageLatency.toFixed(0)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{globalStats.averageImprovement.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Improvement</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{globalStats.totalTests}</div>
              <div className="text-sm text-muted-foreground">Tests Run</div>
            </div>
          </div>

          {/* Server Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Global Server Status</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {servers.map((server) => (
                <div key={server.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getServerStatusIcon(server.status)}
                      <span className="font-medium">{server.name}</span>
                    </div>
                    <Badge variant={
                      server.status === 'online' ? 'default' :
                      server.status === 'slow' ? 'outline' :
                      'destructive'
                    }>
                      {server.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span>{server.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Latency:</span>
                      <span>{formatLatency(server.latency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Load:</span>
                      <span>{server.load}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Checked:</span>
                      <span>{server.lastChecked.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <Progress value={100 - server.load} className="w-full h-2" />
                  </div>
                  
                  <Button 
                    onClick={() => runSpeedTest(server.id)} 
                    size="sm" 
                    variant="outline"
                    className="w-full mt-2"
                    disabled={server.status === 'offline'}
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Speed Test
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Routing Tests */}
          {routingTests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Routing Test Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {routingTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium">
                          {test.sourceRegion} → {test.targetRegion}
                        </span>
                        <Badge variant={
                          test.status === 'completed' ? 'default' :
                          test.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {test.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {test.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {test.status === 'completed' && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Direct:</span>
                          <div className="font-medium">{formatLatency(test.directLatency)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Routed:</span>
                          <div className="font-medium">{formatLatency(test.routedLatency)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Improvement:</span>
                          <div className={`font-medium ${getImprovementColor(test.improvement)}`}>
                            {test.improvement > 0 ? '+' : ''}{test.improvement.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {test.path.length > 1 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Path: {test.path.join(' → ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speed Tests */}
          {speedTests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Speed Test Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {speedTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">
                          {servers.find(s => s.id === test.region)?.name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {test.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Download:</span>
                        <div className="font-medium">{formatSpeed(test.downloadSpeed)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Upload:</span>
                        <div className="font-medium">{formatSpeed(test.uploadSpeed)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency:</span>
                        <div className="font-medium">{formatLatency(test.latency)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Loss:</span>
                        <div className="font-medium">{test.packetLoss.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>Region Routing Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Global server network latency</li>
                <li>• Intelligent path optimization</li>
                <li>• Automatic failover routing</li>
                <li>• Real-time performance monitoring</li>
                <li>• Load balancing algorithms</li>
                <li>• Cross-region speed testing</li>
                <li>• Network health assessment</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Intercontinental routing (India → US)</li>
                <li>• Cross-region transfers (EU → Asia)</li>
                <li>• Network optimization comparison</li>
                <li>• Server load balancing</li>
                <li>• Failover mechanism testing</li>
                <li>• Bandwidth utilization analysis</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Select source region for testing</li>
              <li>Run comprehensive routing tests</li>
              <li>Compare direct vs routed latency</li>
              <li>Analyze optimization improvements</li>
              <li>Test individual server speeds</li>
              <li>Monitor global network health</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">Performance Benefits</h4>
            </div>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Reduced latency through optimal routing</li>
              <li>• Improved user experience globally</li>
              <li>• Better resource utilization</li>
              <li>• Enhanced reliability and uptime</li>
              <li>• Scalable for global user base</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}