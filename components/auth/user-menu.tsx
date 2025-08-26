"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"

export function UserMenu() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-card))',
            border: '1px solid var(--border-muted)'
          }}
        >
          <span className="font-medium" style={{color: 'var(--text-primary)'}}>
            {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
          </span>
        </div>
        <span className="hidden md:block">{session.user.email}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg z-20 border border-gray-800">
            <div className="py-1">
              <div className="px-4 py-2 text-xs text-gray-500">
                Signed in as
              </div>
              <div className="px-4 py-2 text-sm text-white truncate">
                {session.user.email}
              </div>
              <hr className="border-gray-800" />
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}