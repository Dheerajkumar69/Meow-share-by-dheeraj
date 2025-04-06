'use client'

import { motion } from 'framer-motion'

interface TextPreviewProps {
  text: string
}

const TextPreview: React.FC<TextPreviewProps> = ({ text }) => {
  return (
    <motion.div
      className="w-full p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full p-6 bg-white rounded-lg shadow-sm mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Text Preview</h2>
        
        <div className="w-full p-4 bg-gray-50 rounded-lg">
          <pre className="whitespace-pre-wrap break-words text-gray-700 font-mono text-sm">
            {text}
          </pre>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500">
              {text.length} characters
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              Copy
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default TextPreview 