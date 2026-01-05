import type { Request, Response, NextFunction } from "express";

/**
 * In-memory rate limiting store
 * Maps visitor key -> array of request timestamps
 *
 * In production, consider using Redis for distributed rate limiting.
 * For now, this simple in-memory approach prevents abuse within a single instance.
 */
const requestLog: Map<string, number[]> = new Map();

/**
 * Simple rate limiter that tracks requests per visitor
 * Configured for: max 5 creations per 24 hours per visitor
 */
export function rateLimitCreateLaw(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const visitorKey = (req.headers["x-visitor-id"] ||
    req.headers["x-visitorid"] ||
    req.ip) as string;

  if (!visitorKey) {
    return next();
  }

  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const maxRequests = 5;

  // Get or initialize request log for this visitor
  let timestamps = requestLog.get(visitorKey) || [];

  // Remove old requests outside the time window
  timestamps = timestamps.filter((ts) => now - ts < windowMs);

  // Check if limit exceeded
  if (timestamps.length >= maxRequests) {
    const oldestRequest = timestamps[0];
    const resetTime = new Date(oldestRequest + windowMs);
    return _res.status(429).json({
      error: "Límite alcanzado: solo 5 publicaciones por día",
      retryAfter: resetTime.toISOString(),
    });
  }

  // Record this request
  timestamps.push(now);
  requestLog.set(visitorKey, timestamps);

  // Clean up old entries to prevent memory leaks (every 1000 requests)
  if (requestLog.size > 1000) {
    const entries = Array.from(requestLog.entries());
    for (const [key, ts] of entries) {
      const recentTs = ts.filter((t) => now - t < windowMs);
      if (recentTs.length === 0) {
        requestLog.delete(key);
      } else {
        requestLog.set(key, recentTs);
      }
    }
  }

  next();
}
