'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode.react'

interface QRCodeGeneratorProps {
  shareUrl: string
}

export default function QRCodeGenerator({ shareUrl }: QRCodeGeneratorProps) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isCopied])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gradient">Sharing Link Ready!</h2>
        <p className="text-gray-300">
          Use the QR code or link below to share your content
        </p>
      </div>

      <div className="glassmorphism p-5 rounded-2xl">
        <QRCode
          value={shareUrl}
          size={200}
          level="H"
          className="rounded"
          bgColor="rgba(255, 255, 255, 0.1)"
          fgColor="#ffffff"
          imageSettings={{
            src: '/images/logo.png',
            excavate: true,
            width: 40,
            height: 40,
          }}
        />
      </div>

      <div className="flex flex-col w-full">
        <div className="flex items-center gap-2 rounded-xl bg-card p-2 pr-1 w-full overflow-hidden">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-transparent text-white text-sm truncate focus:outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyToClipboard}
            className={`${
              isCopied
                ? 'bg-green-500 text-white'
                : 'button-gradient text-white'
            } rounded-lg flex items-center justify-center px-4 py-2 transition-colors duration-200`}
          >
            <span className="text-sm font-medium">
              {isCopied ? 'Copied!' : 'Copy'}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
} 