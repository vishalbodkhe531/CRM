import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError, HTTP_STATUS } from "../types/error.types";
import { ERROR_CODES } from "../constants/error-codes.constants";
import { isRecord } from "../utils/validation/typeGuards";
import { recordAudit } from "../utils/audit/recordAudit";
import type { AuditAction } from "../contracts/types";

/**
 * Extended Error interface for Prisma errors
 */
interface PrismaError extends Prisma.PrismaClientKnownRequestError {
  meta?: {
    target?: string;
    code?: string;
  };
}

/**
 * Map a resolved error code to a failed-action audit action. Only
 * security/billing-relevant refusals are recorded — an authenticated request
 * that was blocked. Generic validation/not-found is intentionally absent so the
 * trail stays signal-heavy.
 */
const DENIAL_AUDIT_ACTIONS: Record<string, AuditAction> = {
  [ERROR_CODES.ORG_FORBIDDEN]: "PERMISSION_DENIED",
  [ERROR_CODES.SUBSCRIPTION_REQUIRED]: "SUBSCRIPTION_BLOCKED",
  [ERROR_CODES.FEATURE_NOT_AVAILABLE]: "SUBSCRIPTION_BLOCKED",
  [ERROR_CODES.SEAT_LIMIT_REACHED]: "QUOTA_EXCEEDED",
  [ERROR_CODES.LIMIT_REACHED]: "QUOTA_EXCEEDED",
};

/**
 * Record a blocked request in the audit trail. Fire-and-forget: an audit write
 * must never delay or mask the error response. Only fires for an authenticated
 * actor and a mapped denial code.
 */
function recordDenialAudit(
  req: Request,
  errorCode: string,
  statusCode: number,
  reason: string,
): void {
  const action = DENIAL_AUDIT_ACTIONS[errorCode];
  if (!action || !req.user) {
    return;
  }
  recordAudit(req, {
    action,
    entityType: "ACCESS",
    organizationId: req.user.organizationId ?? null,
    after: {
      errorCode,
      statusCode,
      method: req.method,
      path: req.path,
      reason,
    },
  }).catch(() => {
    // An audit failure must never affect the error response.
  });
}

/**
 * Global Error Handler Middleware
 *
 * This middleware handles all errors that occur in the application:
 * - Operational errors (expected, known errors)
 * - Programming errors (bugs, unexpected errors)
 * - Prisma database errors
 * - Zod validation errors
 * - Custom ApiErrors
 *
 * In production mode, stack traces and internal details are hidden.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";
  let errorCode: string = ERROR_CODES.INTERNAL_ERROR;
  let details: unknown = null;

  const isProduction = process.env.NODE_ENV === "production";

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Validation Error";
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
  }
  // Handle custom ApiErrors (including module-specific errors)
  else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = extractErrorCode(err);
    details = err.details; // Use details field only
  }
  // Handle Prisma database errors
  else if (isPrismaError(err)) {
    const prismaResult = handlePrismaError(err);
    statusCode = prismaResult.statusCode;
    message = prismaResult.message;
    errorCode = prismaResult.errorCode;
    details = prismaResult.details;
  }
  // Handle Multer upload errors
  else if (isMulterError(err)) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded image must be 5MB or smaller"
        : err.message;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
  }
  // Handle generic Error objects
  else if (err instanceof Error) {
    message = err.message;
    // Check if it's a known operational error
    if (isOperationalError(err)) {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      errorCode = ERROR_CODES.BUSINESS_RULE_VIOLATION;
    }
  }

  // Log the error with context
  logError(err, req, statusCode, details);

  // Centrally record security/billing refusals so the trail captures blocked
  // attempts, not only successful actions.
  recordDenialAudit(req, errorCode, statusCode, message);

  // Build error response
  const errorResponse: Record<string, unknown> = {
    success: false,
    error: message,
    code: statusCode,
    errorCode,
  };

  // Include details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace only in development for 5xx errors
  if (
    !isProduction &&
    statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR &&
    err instanceof Error
  ) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Extract error code from ApiError or return default
 */
function extractErrorCode(err: ApiError): string {
  // Try to get error code from error name or details
  if ("code" in err && typeof err.code === "string") {
    return err.code;
  }

  if (isRecord(err.details) && typeof err.details.code === "string") {
    return err.details.code;
  }

  // Map common error names to error codes
  const errorName = err.name.toLowerCase();
  if (errorName.includes("auth")) return ERROR_CODES.AUTH_INVALID;
  if (errorName.includes("user")) return ERROR_CODES.RESOURCE_NOT_FOUND;
  if (errorName.includes("item")) return ERROR_CODES.RESOURCE_NOT_FOUND;
  if (errorName.includes("lead")) return ERROR_CODES.RESOURCE_NOT_FOUND;

  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Check if error is a Prisma Client Known Request Error
 */
function isPrismaError(
  err: unknown,
): err is PrismaError {
  if (!isRecord(err)) {
    return false;
  }

  const code = err.code;
  const name = err.name;

  return (
    typeof code === "string" &&
    code.startsWith("P") &&
    name === "PrismaClientKnownRequestError"
  );
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
function handlePrismaError(err: PrismaError): {
  statusCode: number;
  message: string;
  errorCode: string;
  details?: unknown;
} {
  switch (err.code) {
    case "P2002": // Unique constraint failed
      const field = err.meta?.target
        ? Array.isArray(err.meta.target)
          ? err.meta.target.join(", ")
          : err.meta.target
        : "field";
      return {
        statusCode: HTTP_STATUS.CONFLICT,
        message: `A record with this ${field} already exists`,
        errorCode: ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION,
        details: { field: err.meta?.target },
      };

    case "P2025": // Record not found
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: "The requested record was not found",
        errorCode: ERROR_CODES.RESOURCE_NOT_FOUND,
      };

    case "P2003": // Foreign key constraint failed
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: "Invalid reference to related data",
        errorCode: ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION,
      };

    case "P2004": // Constraint violation on field
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: "Data validation failed",
        errorCode: ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION,
        details: err.meta,
      };

    case "P1008": // Database connection error
      return {
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: "Database connection failed",
        errorCode: ERROR_CODES.DATABASE_CONNECTION_ERROR,
      };

    default:
      return {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: "Database operation failed",
        errorCode: ERROR_CODES.DATABASE_ERROR,
      };
  }
}

function isMulterError(err: unknown): err is Error & { code?: string } {
  return err instanceof Error && err.name === "MulterError";
}

/**
 * Determine if an error is operational (expected) or programming (bug)
 */
function isOperationalError(err: Error): boolean {
  // Add custom logic here to detect operational errors
  const operationalErrorNames = [
    "ValidationError",
    "BadRequestError",
    "NotFoundError",
  ];
  return operationalErrorNames.some((name) =>
    err.name.toLowerCase().includes(name.toLowerCase()),
  );
}

/**
 * Log error with appropriate context
 */
function logError(
  err: unknown,
  req: Request,
  statusCode: number,
  details: unknown,
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    errorName: err instanceof Error ? err.name : "Unknown",
    errorMessage: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    details,
    user: req.user?.id || "anonymous",
  };

  // Log based on severity
  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error("Server Error", logData);
  } else if (statusCode >= HTTP_STATUS.BAD_REQUEST) {
    logger.warn(`Client Error (${statusCode})`, logData);
  }
}
