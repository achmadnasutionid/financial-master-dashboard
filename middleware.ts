import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add cache control headers for API responses
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // For GET requests, allow caching for 60 seconds
    if (request.method === "GET") {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      )
    }
    
    // Enable compression hint
    response.headers.set("Vary", "Accept-Encoding")
  }

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
}

// Only run middleware on API routes
export const config = {
  matcher: ["/api/:path*"],
}

