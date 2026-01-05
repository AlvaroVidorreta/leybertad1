import type { Request } from "express";

/**
 * Extracts the visitor key from a request.
 * Priority:
 * 1. Server-generated session ID (most secure)
 * 2. x-visitor-id header (legacy/client-supplied, less secure)
 * 3. Request IP (fallback)
 *
 * NOTE: Server-generated session ID from cookies is preferred.
 * Client-supplied visitor IDs should NOT be trusted for enforcement.
 * This function is maintained for backward compatibility.
 */
export function getVisitorKey(req: Request): string {
  // Priority 1: Use server-generated session ID if available
  const sessionId = (req as any).sessionId;
  if (sessionId) {
    return sessionId;
  }

  // Priority 2: Check for client-supplied visitor ID (legacy)
  const headerValue = req.headers["x-visitor-id"] || req.headers["x-visitorid"];
  if (headerValue && typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  // Priority 3: Fall back to request IP
  return (
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    "unknown"
  );
}
