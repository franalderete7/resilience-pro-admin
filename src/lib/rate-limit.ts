/**
 * Rate Limiting
 * 
 * Protects API routes from abuse using Upstash Redis.
 * Falls back to in-memory rate limiting if Upstash is not configured.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'
import { logger } from './logger'

// In-memory fallback for development
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private maxRequests: number
  private window: number

  constructor(limit: number, windowMs: number) {
    this.maxRequests = limit
    this.window = windowMs
  }

  async limit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.window)
    
    if (validRequests.length >= this.maxRequests) {
      this.requests.set(identifier, validRequests)
      return { success: false, remaining: 0 }
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return { success: true, remaining: this.maxRequests - validRequests.length }
  }
}

// Initialize rate limiters
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null
const inMemoryLimiter = new InMemoryRateLimiter(10, 60000) // Always create fallback

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      analytics: true,
    })
    
    logger.info('Rate limiting initialized with Upstash Redis')
  } else {
    logger.warn('Upstash Redis not configured, using in-memory rate limiting')
  }
} catch (error) {
  logger.error('Failed to initialize rate limiting:', error)
}

/**
 * Get identifier for rate limiting (IP address or user ID)
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
  
  const ip = request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'anonymous'
  
  return `ip:${ip}`
}

/**
 * Rate limit a request
 */
export async function rateLimit(
  request: NextRequest,
  userId?: string
): Promise<{ success: boolean; remaining: number; limit: number; reset: number }> {
  const identifier = getIdentifier(request, userId)
  
  try {
    if (ratelimit) {
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
      return { success, remaining, limit, reset }
    } else {
      const { success, remaining } = await inMemoryLimiter.limit(identifier)
      return { 
        success, 
        remaining, 
        limit: 10, 
        reset: Date.now() + 60000 
      }
    }
  } catch (error) {
    logger.error('Rate limit check failed:', error)
    // If rate limiting fails, allow the request (fail open)
    return { success: true, remaining: 10, limit: 10, reset: Date.now() + 60000 }
  }
}

/**
 * Rate limit for expensive operations (LLM calls)
 */
export async function rateLimitExpensive(
  request: NextRequest,
  userId?: string
): Promise<{ success: boolean; remaining: number; limit: number; reset: number }> {
  const identifier = `expensive:${getIdentifier(request, userId)}`
  
  try {
    if (ratelimit) {
      // 3 requests per 5 minutes for expensive operations
      const expensiveRatelimit = new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(3, '5 m'),
        analytics: true,
      })
      
      const { success, limit, remaining, reset } = await expensiveRatelimit.limit(identifier)
      return { success, remaining, limit, reset }
    } else {
      // Fallback: 3 per 5 minutes
      const fallback = new InMemoryRateLimiter(3, 300000)
      const { success, remaining } = await fallback.limit(identifier)
      return { 
        success, 
        remaining, 
        limit: 3, 
        reset: Date.now() + 300000 
      }
    }
  } catch (error) {
    logger.error('Expensive rate limit check failed:', error)
    return { success: true, remaining: 3, limit: 3, reset: Date.now() + 300000 }
  }
}
