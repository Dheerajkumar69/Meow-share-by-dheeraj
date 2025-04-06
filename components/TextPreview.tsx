'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface TextPreviewProps {
  text: string
}

export default function TextPreview({ text }: TextPreviewProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-medium text-gradient">Shared Text</h3>
          <span className="text-sm text-blue-600">
            {text.length} character{text.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="glassmorphism p-4 rounded-xl">
          <pre className="w-full max-h-48 overflow-auto whitespace-pre-wrap break-words text-blue-900 font-mono text-sm">
            {text}
          </pre>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyToClipboard}
          className={`${
            copied
              ? 'bg-green-500 text-white'
              : 'button-gradient text-white'
          } py-2 px-4 rounded-full flex items-center justify-center gap-2 transition-colors duration-200 self-end`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
          {copied ? 'Copied!' : 'Copy Text'}
        </motion.button>
      </div>
    </motion.div>
  )
} 