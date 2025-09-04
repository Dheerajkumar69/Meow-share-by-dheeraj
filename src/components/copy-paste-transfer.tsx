'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Copy, 
  Check, 
  Link, 
  FileText, 
  Type,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Monitor,
  Share2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CopyPasteItem {
  id: string
  type: 'text' | 'link'
  content: string
  timestamp: Date
  platform?: 'web' | 'mobile' | 'desktop'
}

export function CopyPasteTransfer() {
  const [items, setItems] = useState<CopyPasteItem[]>([])
  const [textInput, setTextInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      })
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      
      if (text) {
        // Determine if it's a URL or text
        const isUrl = /^https?:\/\//.test(text)
        const type: 'text' | 'link' = isUrl ? 'link' : 'text'
        
        const newItem: CopyPasteItem = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          content: text,
          timestamp: new Date(),
          platform: getPlatform()
        }
        
        setItems(prev => [newItem, ...prev])
        
        toast({
          title: "Pasted!",
          description: `Content added as ${type}.`,
        })
      }
    } catch (error) {
      toast({
        title: "Paste Failed",
        description: "Could not read from clipboard.",
        variant: "destructive",
      })
    }
  }

  const getPlatform = (): 'web' | 'mobile' | 'desktop' => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      return 'mobile'
    }
    return 'desktop'
  }

  const addTextItem = () => {
    if (!textInput.trim()) return
    
    const newItem: CopyPasteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      content: textInput,
      timestamp: new Date(),
      platform: getPlatform()
    }
    
    setItems(prev => [newItem, ...prev])
    setTextInput('')
    
    toast({
      title: "Text Added!",
      description: "Text snippet ready for sharing.",
    })
  }

  const addLinkItem = () => {
    if (!linkInput.trim()) return
    
    const newItem: CopyPasteItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'link',
      content: linkInput,
      timestamp: new Date(),
      platform: getPlatform()
    }
    
    setItems(prev => [newItem, ...prev])
    setLinkInput('')
    
    toast({
      title: "Link Added!",
      description: "Link ready for sharing.",
    })
  }

  const shareItem = async (item: CopyPasteItem) => {
    setIsSharing(true)
    
    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: item.type === 'link' ? 'Shared Link' : 'Shared Text',
          text: item.content,
          url: item.type === 'link' ? item.content : undefined
        })
      } else {
        // Fallback: copy to clipboard
        await copyToClipboard(item.content, item.id)
      }
    } catch (error) {
      console.log('Share cancelled or failed:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const clearAll = () => {
    setItems([])
    toast({
      title: "Cleared!",
      description: "All items removed.",
    })
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const getPlatformIcon = (platform?: 'web' | 'mobile' | 'desktop') => {
    switch (platform) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'desktop':
        return <Monitor className="w-4 h-4" />
      default:
        return <Type className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Copy-Paste Transfer Test
          </CardTitle>
          <CardDescription>
            Test text and link sharing across devices using clipboard operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Text Snippet</label>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text to share..."
                rows={3}
              />
              <Button onClick={addTextItem} className="w-full">
                <Type className="w-4 h-4 mr-2" />
                Add Text
              </Button>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Link URL</label>
              <Input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://example.com"
              />
              <Button onClick={addLinkItem} className="w-full">
                <Link className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>

          {/* Clipboard Operations */}
          <div className="flex gap-4">
            <Button onClick={pasteFromClipboard} variant="outline" className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Paste from Clipboard
            </Button>
            <Button onClick={clearAll} variant="outline" disabled={items.length === 0}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Shared Items ({items.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(item.platform)}
                        <Badge variant={item.type === 'link' ? 'default' : 'secondary'}>
                          {item.type === 'link' ? 'Link' : 'Text'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => shareItem(item)}
                          variant="ghost"
                          size="sm"
                          disabled={isSharing}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => copyToClipboard(item.content, item.id)}
                          variant="ghost"
                          size="sm"
                        >
                          {copiedItem === item.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="sm"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      {item.type === 'link' ? (
                        <a 
                          href={item.content} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {item.content}
                        </a>
                      ) : (
                        <p className="text-muted-foreground break-all">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                No items shared yet. Add text or links above to test cross-device copy-paste functionality.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Information */}
      <Card>
        <CardHeader>
          <CardTitle>Copy-Paste Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Features Tested</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Clipboard API support</li>
                <li>• Text snippet sharing</li>
                <li>• URL link sharing</li>
                <li>• Cross-platform compatibility</li>
                <li>• Web Share API integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Test Scenarios</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PC to mobile text transfer</li>
                <li>• Mobile to desktop link sharing</li>
                <li>• Multi-device clipboard sync</li>
                <li>• Native share integration</li>
                <li>• Fallback copy operations</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">How to Test</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Add text or links on this device</li>
              <li>Copy items to clipboard</li>
              <li>Switch to another device/browser</li>
              <li>Paste to verify cross-device transfer</li>
              <li>Use native share when available</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}