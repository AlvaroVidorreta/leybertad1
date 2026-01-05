import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Session store - in production, use Redis or a session store library
 * Maps session ID -> visitor data
 */
const sessionStore: Map<string, { id: string; createdAt: number }> = new Map();

const SESSION_COOKIE_NAME = "x-session-id";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Clean up every hour

/**
 * Initialize session middleware
 * Periodically cleans up expired sessions
 */
export function initializeSessionMiddleware() {
  setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [sessionId, data] of sessionStore.entries()) {
      if (now - data.createdAt > SESSION_MAX_AGE_MS) {
        toDelete.push(sessionId);
      }
    }

    toDelete.forEach((id) => sessionStore.delete(id));

    if (toDelete.length > 0) {
      // eslint-disable-next-line no-console
      console.debug(`Cleaned up ${toDelete.length} expired sessions`);
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Middleware to handle session creation and validation
 * Replaces client-supplied visitor IDs with server-generated session IDs
 */
export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  let isNewSession = false;

  // Validate existing session or create new one
  if (!sessionId || !sessionStore.has(sessionId)) {
    sessionId = randomUUID();
    isNewSession = true;
    sessionStore.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
    });
  }

  // Attach session to request for use in route handlers
  (req as any).sessionId = sessionId;
  (req as any).isNewSession = isNewSession;

  // Set secure session cookie
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true, // Prevents JavaScript access, protects against XSS
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });

  next();
}

/**
 * Get visitor key from request
 * Prefers server session ID over client-supplied headers
 * Fallback to IP for non-session requests
 */
export function getVisitorKeyFromSession(req: Request): string {
  // Use server-generated session ID (most secure)
  if ((req as any).sessionId) {
    return (req as any).sessionId;
  }

  // Fallback to client header (less secure, for compatibility)
  const header = req.headers["x-visitor-id"] || req.headers["x-visitorid"];
  if (header && typeof header === "string" && header.trim()) {
    return header.trim();
  }

  // Fallback to IP (limited security)
  return req.ip || "unknown";
}
