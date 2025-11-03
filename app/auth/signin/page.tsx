"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function SignInComponent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-base)'}}>
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-32 h-32">
            <svg viewBox="0 0 1000 1000" className="w-full h-full">
              <defs>
                <style>
                  {`.logo-bg { fill: transparent; } .logo-text { fill: var(--text-primary); } .logo-accent { fill: var(--accent-primary); }`}
                </style>
              </defs>
              <rect className="logo-bg" width="1000" height="1000"></rect>
              <g>
                <g>
                  <path className="logo-text" d="M744.02,725.16h-77.12l-42.19-97.08-94.02-220.6-65.13,150.13-72.31,167.55h-75.99l194.08-449.7h39.22l193.47,449.7Z"></path>
                  <path className="logo-text" d="M864.04,725.16h-70.56v-450.31h70.56v450.31Z"></path>
                </g>
                <path className="logo-accent" d="M252.65,316.43l-23.46-41.49c-62.15,107.41-93.23,177.62-93.23,210.45v26c0,32.92,31.78,103.82,95.07,212.81,61.28-107.41,92.01-177.18,91.92-209.22v-29.85c0-14.71-7.88-39.57-23.46-74.67-15.58-35.02-31.25-66.36-46.83-94.02h0ZM267.19,535.8c-10.33,10.42-22.94,15.58-37.64,15.67-14.71,0-27.31-5.16-37.64-15.49-10.42-10.33-15.58-22.94-15.67-37.64,0-14.71,5.16-27.31,15.49-37.64,10.33-10.42,22.94-15.58,37.64-15.67,14.71,0,27.31,5.16,37.64,15.49,10.42,10.33,15.58,22.94,15.67,37.64.09,14.71-5.08,27.31-15.49,37.64h0Z"></path>
              </g>
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
            Use your @rootedsolutions.co Google account to continue
          </p>
        </div>
        
        {error === "AccessDenied" && (
          <div className="px-4 py-3 rounded-lg" style={{
            background: 'rgba(181, 92, 92, 0.1)',
            border: '1px solid rgba(181, 92, 92, 0.3)',
            color: '#b55c5c'
          }}>
            Access denied. Only @rootedsolutions.co emails are allowed.
          </div>
        )}
        
        {error && error !== "AccessDenied" && (
          <div className="px-4 py-3 rounded-lg" style={{
            background: 'rgba(181, 92, 92, 0.1)',
            border: '1px solid rgba(181, 92, 92, 0.3)',
            color: '#b55c5c'
          }}>
            An error occurred during sign in. Please try again.
          </div>
        )}

        <div>
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="group relative w-full flex justify-center items-center py-3 px-4 text-sm font-medium rounded-lg btn-primary"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{background: 'var(--bg-base)'}} />}>
      <SignInComponent />
    </Suspense>
  )
}