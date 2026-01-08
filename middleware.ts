import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add cache control headers for API responses
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Only cache MASTER DATA endpoints (rarely change)
    const masterDataEndpoints = [
      "/api/companies",
      "/api/products",
      "/api/billings",
      "/api/signatures",
    ]
    
    const isMasterData = masterDataEndpoints.some(endpoint => 
      request.nextUrl.pathname === endpoint || 
      request.nextUrl.pathname.startsWith(endpoint + "/")
    )
    
    if (request.method === "GET") {
      if (isMasterData) {
        // Cache master data for 60 seconds
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=60, stale-while-revalidate=300"
        )
      } else {
        // NO CACHE for transaction data (quotations, invoices, expenses, etc)
        response.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, max-age=0"
        )
      }
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

