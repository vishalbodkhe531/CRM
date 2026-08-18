import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/appError";
 
import { logger } from "../config/logger";
 
/**
 * CSRF Protection Middleware
 * 
 * This middleware enforces that all state-changing requests (POST, PUT, DELETE, PATCH)
 * must include a custom header 'X-Requested-With' or 'X-CSRF-Token'.
 * This is a standard way to prevent CSRF in SPA-API architectures where
 * the frontend and backend are on different domains.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  
  // Normalize path to ignore trailing slashes
  const path = req.path.replace(/\/$/, "") || "/";
  
  // Exempt ONLY login and health checks. 
  // Refresh and logout MUST now be protected as they use cookies.
  const isAuthExempt = path.endsWith("/auth/login");
  const isHealthPath = path === "/health";
  
  if (safeMethods.includes(req.method) || isAuthExempt || isHealthPath) {
    return next();
  }
 
  // Require either of the standard security headers
  const csrfHeader = req.get("x-csrf-token") || req.get("x-requested-with");
 
  if (!csrfHeader) {
    logger.warn("CSRF validation failed: Missing security headers", { 
      path: req.path, 
      method: req.method, 
      ip: req.ip 
    });
    return next(AppError.authorization.forbidden("CSRF validation failed: Missing required security headers."));
  }
 
  next();
};
