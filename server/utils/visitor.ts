import type { Request } from "express";

/**
 * Extracts the visitor key from a request.
 * Priority: x-visitor-id header > x-visitorid header > request IP
 * 
 * NOTE: Server should NOT trust client-supplied visitor IDs for enforcement.
 * This should primarily be used for non-critical tracking. For rate limiting
 * and authorization, consider using server-generated session cookies or IP-based
 * restrictions.
 */
export function getVisitorKey(req: Request): string {
  // Check for client-supplied visitor ID (lowest priority)
  const headerValue = req.headers["x-visitor-id"] || req.headers["x-visitorid"];
  if (headerValue && typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  // Fall back to request IP
  return (
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    "unknown"
  );
}
