import type { Request, Response, NextFunction } from "express";

/**
 * Structured error object for consistent error handling
 */
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Centralized error handling middleware
 * Logs errors consistently and returns normalized error responses
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor";
  const code = err.code || "INTERNAL_ERROR";

  // Log error for debugging
  if (statusCode >= 500) {
    console.error(`[${code}]`, message, err);
  }

  // Never expose internal error details to client
  const clientMessage =
    statusCode >= 500 ? "Error interno del servidor" : message;

  res.status(statusCode).json({
    error: clientMessage,
    code,
    ...(process.env.NODE_ENV === "development" && { details: message }),
  });
}

/**
 * Wraps async route handlers to catch errors automatically
 * Usage: app.post("/api/route", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
