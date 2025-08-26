"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ErrorComponent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in. Only @rootedsolutions.co emails are allowed.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication.",
  }

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-base)'}}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
            Authentication Error
          </h2>
          <p className="mt-2 text-sm" style={{color: 'var(--text-secondary)'}}>
            {errorMessage}
          </p>
        </div>
        
        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-3 px-4 text-sm font-medium rounded-lg btn-primary"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{background: 'var(--bg-base)'}} />}>
      <ErrorComponent />
    </Suspense>
  )
}