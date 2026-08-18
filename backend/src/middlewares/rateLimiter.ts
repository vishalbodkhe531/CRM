import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors/appError";

/**
 * Rate Limiter Middleware
 *
 * Prevents brute-force attacks by limiting requests per IP address.
 */

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      AppError.system.tooManyRequests(
        "Too many requests, please try again later.",
      ),
    );
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth-specific rate limiter - 5 requests per 5 minutes (stricter for login/register)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      AppError.system.tooManyRequests(
        "Too many authentication attempts, please try again after 5 minutes.",
      ),
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false,
});

// Refresh token rate limiter - 10 requests per 5 minutes
export const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      AppError.system.tooManyRequests(
        "Too many token refresh attempts, please try again later.",
      ),
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter - 3 requests per hour (very strict)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      AppError.system.tooManyRequests(
        "Too many password reset attempts, please try again after an hour.",
      ),
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reset-link verification/submission limiter - permits normal verify + retry flow
export const passwordResetTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      AppError.system.tooManyRequests(
        "Too many password reset attempts, please try again later.",
      ),
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});
