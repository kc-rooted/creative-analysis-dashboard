import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
  const isPublicFile = req.nextUrl.pathname.startsWith("/_next") ||
                       req.nextUrl.pathname.includes(".")
  const isReportRoute = req.nextUrl.pathname.startsWith("/reports")

  // Allow reports route when accessed from localhost (for Puppeteer PDF generation)
  const isLocalhost = req.headers.get("host")?.includes("localhost") ||
                     req.headers.get("host")?.includes("127.0.0.1")

  // Allow public files and auth API routes
  if (isPublicFile || isApiAuthRoute) {
    return NextResponse.next()
  }

  // Allow reports route from localhost (for PDF generation)
  if (isReportRoute && isLocalhost) {
    return NextResponse.next()
  }

  // Redirect to home if trying to access auth pages while logged in
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Redirect to sign in if not logged in and trying to access protected routes
  if (!isAuthPage && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}