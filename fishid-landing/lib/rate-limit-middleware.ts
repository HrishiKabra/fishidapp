import { type NextRequest, NextResponse } from "next/server"
import { authLimiter, generalLimiter, strictLimiter, type RateLimiter } from "./rate-limiter"

// Get client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback to a default if we can't determine the IP
  return request.ip || "unknown"
}

// Rate limit response with proper headers
function createRateLimitResponse(message: string, resetTime: number, remaining: number, total: number): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      rateLimitExceeded: true,
      resetTime: new Date(resetTime).toISOString(),
    },
    { status: 429 },
  )

  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", total.toString())
  response.headers.set("X-RateLimit-Remaining", remaining.toString())
  response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
  response.headers.set("Retry-After", Math.ceil((resetTime - Date.now()) / 1000).toString())

  return response
}

// Apply rate limiting to a request
export async function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  endpoint: string,
): Promise<NextResponse | null> {
  const clientIP = getClientIP(request)
  const result = await limiter.checkLimit(clientIP, endpoint)

  if (!result.allowed) {
    return createRateLimitResponse(limiter.getMessage(), result.resetTime, result.remaining, result.total)
  }

  return null
}

// Record the request after processing
export async function recordRequest(request: NextRequest, limiter: RateLimiter, endpoint: string, success = true) {
  const clientIP = getClientIP(request)
  await limiter.recordRequest(clientIP, endpoint, success)
}

// Wrapper function for easy use in API routes
export function withRateLimit(limiter: RateLimiter, endpoint: string) {
  return async function rateLimitWrapper(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    // Check rate limit
    const rateLimitResponse = await applyRateLimit(request, limiter, endpoint)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    let response: NextResponse
    let success = true

    try {
      // Execute the actual handler
      response = await handler(request)

      // Consider 4xx and 5xx as failures for rate limiting purposes
      success = response.status < 400
    } catch (error) {
      success = false
      // Re-throw the error to be handled by the caller
      throw error
    } finally {
      // Record the request
      await recordRequest(request, limiter, endpoint, success)
    }

    // Add rate limit headers to successful responses
    const result = await limiter.checkLimit(getClientIP(request), endpoint)
    response.headers.set("X-RateLimit-Limit", result.total.toString())
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
    response.headers.set("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString())

    return response
  }
}

// Export the limiters for direct use
export { authLimiter, generalLimiter, strictLimiter }
