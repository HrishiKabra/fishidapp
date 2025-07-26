interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      message: "Too many requests, please try again later.",
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    }

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  private getKey(identifier: string, endpoint: string): string {
    return `${identifier}:${endpoint}`
  }

  async checkLimit(
    identifier: string,
    endpoint: string,
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number; total: number }> {
    const key = this.getKey(identifier, endpoint)
    const now = Date.now()

    let entry = this.store.get(key)

    // If no entry exists or the window has expired, create a new one
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
      }
      this.store.set(key, entry)
    }

    const allowed = entry.count < this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count - 1)

    return {
      allowed,
      resetTime: entry.resetTime,
      remaining,
      total: this.config.maxRequests,
    }
  }

  async recordRequest(identifier: string, endpoint: string, success = true) {
    // Skip counting based on configuration
    if ((success && this.config.skipSuccessfulRequests) || (!success && this.config.skipFailedRequests)) {
      return
    }

    const key = this.getKey(identifier, endpoint)
    const entry = this.store.get(key)

    if (entry) {
      entry.count++
      this.store.set(key, entry)
    }
  }

  getMessage(): string {
    return this.config.message || "Too many requests, please try again later."
  }
}

// Different rate limiters for different endpoints
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again in 15 minutes.",
  skipSuccessfulRequests: true, // Only count failed attempts
})

export const generalLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: "Too many requests. Please slow down.",
})

export const strictLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for sensitive endpoints
  message: "Rate limit exceeded for this endpoint. Please try again later.",
})

export { RateLimiter }
