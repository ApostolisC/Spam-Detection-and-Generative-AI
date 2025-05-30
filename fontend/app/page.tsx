'use client'

import { useState } from 'react'
import Conversations from '@/components/Conversations'
import SpamCheck from '@/components/SpamCheck'

export default function HomePage() {
  const [tab, setTab] = useState<'conversations' | 'spam'>('conversations')

  return (
    <div>
      <nav className="flex space-x-4 mb-4 border-b pb-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex-wrap justify-center items-center gap-4">
        <button onClick={() => setTab('conversations')} className={tab === 'conversations' ? 'font-bold' : ''}>
          Conversations
        </button>
        <button onClick={() => setTab('spam')} className={tab === 'spam' ? 'font-bold' : ''}>
          Spam Check
        </button>
      </nav>

      <div>
        <div className={tab === 'conversations' ? 'block' : 'hidden'}>
          <Conversations />
        </div>
        <div className={tab === 'spam' ? 'block' : 'hidden'}>
          <SpamCheck />
        </div>
      </div>
    </div>
  )
}
