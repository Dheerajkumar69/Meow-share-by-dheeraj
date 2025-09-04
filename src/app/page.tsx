'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [isHovering, setIsHovering] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center space-y-12">
          {/* Logo and Title */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-24 h-24 md:w-32 md:h-32">
              <img
                src="/logo.svg"
                alt="FileShare Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FileShare
            </h1>
            <p className="text-xl text-muted-foreground text-center max-w-md">
              Simple, secure file sharing. No login required.
            </p>
          </div>

          {/* Main Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Send Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">Send a File</CardTitle>
                <CardDescription>
                  Share files of any size with anyone, anywhere
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/send">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onMouseEnter={() => setIsHovering('send')}
                    onMouseLeave={() => setIsHovering(null)}
                  >
                    Send File
                    <ArrowRight className={`w-4 h-4 ml-2 transition-transform ${isHovering === 'send' ? 'translate-x-1' : ''}`} />
                  </Button>
                </Link>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>No size limits</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Auto-delete after 24 hours</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Secure transfer</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receive Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                  <Download className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-2xl">Receive a File</CardTitle>
                <CardDescription>
                  Download files shared with you using a simple code
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/receive">
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant="outline"
                    onMouseEnter={() => setIsHovering('receive')}
                    onMouseLeave={() => setIsHovering(null)}
                  >
                    Receive File
                    <ArrowRight className={`w-4 h-4 ml-2 transition-transform ${isHovering === 'receive' ? 'translate-x-1' : ''}`} />
                  </Button>
                </Link>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Enter share code</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Resume interrupted downloads</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>One-time access</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl mt-16">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">∞</span>
              </div>
              <h3 className="font-semibold">Unlimited Size</h3>
              <p className="text-sm text-muted-foreground">Share files of any size with chunked uploads</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">🔒</span>
              </div>
              <h3 className="font-semibold">Secure</h3>
              <p className="text-sm text-muted-foreground">Files are automatically deleted after 24 hours</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">⚡</span>
              </div>
              <h3 className="font-semibold">Fast</h3>
              <p className="text-sm text-muted-foreground">Optimized for speed with resume capability</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}