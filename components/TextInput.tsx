'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface TextInputProps {
  onTextShare: (text: string) => void
}

export default function TextInput({ onTextShare }: TextInputProps) {
  const [text, setText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    if (error) setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Please enter some text to share')
      return
    }
    
    onTextShare(text)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div className="glassmorphism p-4 rounded-xl">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Type or paste your text here..."
            className="w-full h-48 px-4 py-3 bg-transparent text-white placeholder:text-gray-400 resize-none focus:outline-none"
            autoFocus
          />
        </div>
        
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {text.length > 0 
              ? `${text.length} character${text.length !== 1 ? 's' : ''}`
              : 'Share text instantly with anyone'}
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="button-gradient text-white font-medium py-2 px-8 rounded-full shadow-lg"
          >
            Share Text
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
} 