'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export interface TextInputProps {
  onTextSubmit: (text: string) => void
}

export default function TextInput({ onTextSubmit }: TextInputProps) {
  const [text, setText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Please enter some text to share')
      return
    }
    
    setError(null)
    onTextSubmit(text)
  }

  return (
    <div className="w-full">
      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <label htmlFor="shareText" className="block text-blue-800 font-medium mb-2">
            Text to Share
          </label>
          <textarea
            id="shareText"
            rows={6}
            className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            placeholder="Enter the text you want to share..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-red-500 text-sm"
            >
              {error}
            </motion.p>
          )}
          
          <div className="text-right text-sm text-blue-600 mt-2">
            {text.length} character{text.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="button-gradient text-white font-medium py-3 px-6 rounded-full shadow-md w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 inline-block">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share Text
        </motion.button>
      </motion.form>
    </div>
  )
} 