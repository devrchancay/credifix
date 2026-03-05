import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Pre-configured rate limiters for different endpoint categories.
 * Uses sliding window algorithm for smooth rate limiting.
 */
export const rateLimiters = {
  /** Auth endpoints: 10 requests per 60 seconds per IP */
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    prefix: "rl:auth",
  }),

  /** Chat/AI endpoints: 30 requests per 60 seconds per user */
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    prefix: "rl:chat",
  }),

  /** File upload: 20 requests per 60 seconds per user */
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "rl:upload",
  }),

  /** Public endpoints (referral validate, etc): 15 requests per 60 seconds per IP */
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "60 s"),
    prefix: "rl:public",
  }),

  /** Billing operations: 10 requests per 60 seconds per user */
  billing: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    prefix: "rl:billing",
  }),
};

export type RateLimiterName = keyof typeof rateLimiters;

/**
 * Check rate limit for a given identifier (userId or IP).
 * Returns a 429 response if exceeded, or null if allowed.
 */
export async function checkRateLimit(
  limiter: RateLimiterName,
  identifier: string
): Promise<NextResponse | null> {
  try {
    const { success, limit, remaining, reset } =
      await rateLimiters[limiter].limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null;
  } catch {
    // If Redis is unavailable, allow the request (fail-open)
    return null;
  }
}

/** Extract IP from request headers (works behind Vercel/proxies) */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
