'use client'

import Link from 'next/link'

export default function Header() {
  return (
    <header className="w-full py-6 px-4 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <Link href="/" className="text-3xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
          Meow Share
        </Link>
        <p className="text-sm text-gray-500 mt-1">Made with ❤️ by Dheeraj</p>
      </div>
    </header>
  )
} 