/**
 * Error Factory - Helper functions for creating standardized errors
 *
 * Usage:
 *   throw AppError.auth.invalidCredentials();
 *   throw AppError.resource.notFound('User');
 *   throw AppError.validation.fieldRequired('email');
 */

import { ApiError, HTTP_STATUS } from "../../types/error.types";
import { ERROR_CODES } from "../../constants/error-codes.constants";

/**
 * Authentication Errors (401)
 */
const authentication = {
  invalidCredentials: (message = "Invalid credentials") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_INVALID,
    }),

  tokenExpired: (message = "Token has expired") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_EXPIRED,
    }),

  tokenInvalid: (message = "Token is invalid") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_INVALID,
    }),

  userNotFound: (message = "User not found") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_USER_NOT_FOUND,
    }),

  userDisabled: (message = "User account is disabled") =>
    new ApiError(message, HTTP_STATUS.FORBIDDEN, true, {
      code: ERROR_CODES.AUTH_USER_DISABLED,
    }),

  emailExists: (message = "Email already registered") =>
    new ApiError(message, HTTP_STATUS.CONFLICT, true, {
      code: ERROR_CODES.AUTH_EMAIL_EXISTS,
    }),

  required: (message = "Authentication required") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_REQUIRED,
    }),

  unauthorized: (message = "Unauthorized access") =>
    new ApiError(message, HTTP_STATUS.UNAUTHORIZED, true, {
      code: ERROR_CODES.AUTH_INVALID,
    }),
};

/**
 * Authorization Errors (403)
 */
const authorization = {
  forbidden: (message = "Access denied") =>
    new ApiError(message, HTTP_STATUS.FORBIDDEN, true, {
      code: ERROR_CODES.ORG_FORBIDDEN,
    }),

  roleRequired: (role: string) =>
    new ApiError(`Requires ${role} role`, HTTP_STATUS.FORBIDDEN, true, {
      code: ERROR_CODES.ORG_FORBIDDEN,
      role,
    }),

  suspended: (
    message = "Your organization account is suspended. Please contact Super Admin.",
  ) =>
    new ApiError(message, HTTP_STATUS.FORBIDDEN, true, {
      code: ERROR_CODES.ORG_SUSPENDED,
    }),
};

/**
 * Validation Errors (400)
 */
const validation = {
  badRequest: (message = "Invalid request", details?: unknown) =>
    new ApiError(
      message,
      HTTP_STATUS.BAD_REQUEST,
      true,
      details || {
        code: ERROR_CODES.VALIDATION_ERROR,
      },
    ),

  fieldRequired: (field: string) =>
    new ApiError(`${field} is required`, HTTP_STATUS.BAD_REQUEST, true, {
      code: ERROR_CODES.VALIDATION_FIELD_REQUIRED,
      field,
    }),

  invalidFormat: (field: string, expected: string) =>
    new ApiError(
      `${field} must be ${expected}`,
      HTTP_STATUS.BAD_REQUEST,
      true,
      {
        code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
        field,
        expected,
      },
    ),
};

/**
 * Resource Errors (404, 409)
 */
const resource = {
  notFound: (resourceName: string, id?: string) => {
    const message = id
      ? `${resourceName} with ID ${id} not found`
      : `${resourceName} not found`;
    return new ApiError(message, HTTP_STATUS.NOT_FOUND, true, {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      resource: resourceName,
      id,
    });
  },

  conflict: (message = "Resource conflict") =>
    new ApiError(message, HTTP_STATUS.CONFLICT, true, {
      code: ERROR_CODES.RESOURCE_CONFLICT,
    }),

  alreadyExists: (resourceName: string, field: string) =>
    new ApiError(
      `${resourceName} with this ${field} already exists`,
      HTTP_STATUS.CONFLICT,
      true,
      {
        code: ERROR_CODES.RESOURCE_ALREADY_EXISTS,
        resource: resourceName,
        field,
      },
    ),
};

/**
 * Database Errors (500, 503)
 */
const database = {
  error: (message = "Database operation failed") =>
    new ApiError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      code: ERROR_CODES.DATABASE_ERROR,
    }),

  constraintViolation: (field?: string) =>
    new ApiError(
      field ? `Unique constraint failed on ${field}` : "Constraint violation",
      HTTP_STATUS.CONFLICT,
      true,
      {
        code: ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION,
        field,
      },
    ),

  connectionError: (message = "Database connection failed") =>
    new ApiError(message, HTTP_STATUS.SERVICE_UNAVAILABLE, false, {
      code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
    }),
};

/**
 * Business Logic Errors (400, 403, 409)
 */
const business = {
  ruleViolation: (message = "Business rule violated") =>
    new ApiError(message, HTTP_STATUS.BAD_REQUEST, true, {
      code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
    }),

  invalidOperation: (message = "Invalid operation") =>
    new ApiError(message, HTTP_STATUS.BAD_REQUEST, true, {
      code: ERROR_CODES.INVALID_OPERATION,
    }),

  stateConflict: (message = "Resource state conflict") =>
    new ApiError(message, HTTP_STATUS.CONFLICT, true, {
      code: ERROR_CODES.STATE_CONFLICT,
    }),
};

/**
 * Billing Errors (402, 400)
 */
const billing = {
  /**
   * 402, not 403: the client distinguishes "you may not do this" from "your
   * account needs paying for", and only the second routes the user to billing.
   */
  subscriptionRequired: (
    message = "Your subscription has lapsed. Renew to continue making changes.",
  ) =>
    new ApiError(message, HTTP_STATUS.PAYMENT_REQUIRED, true, {
      code: ERROR_CODES.SUBSCRIPTION_REQUIRED,
    }),

  /** Carries the numbers so the UI can say "5 of 5 used" without a second call. */
  seatLimitReached: (used: number, limit: number) =>
    new ApiError(
      `Seat limit reached: ${used} of ${limit} seats in use. Upgrade your plan or disable an existing user.`,
      HTTP_STATUS.BAD_REQUEST,
      true,
      {
        code: ERROR_CODES.SEAT_LIMIT_REACHED,
        used,
        limit,
      },
    ),

  /** Generic plan-limit exhaustion for leads/prospects/quotations/items. */
  limitReached: (label: string, used: number, limit: number) =>
    new ApiError(
      `${label} limit reached: ${used} of ${limit} used. Upgrade your plan to add more.`,
      HTTP_STATUS.BAD_REQUEST,
      true,
      {
        code: ERROR_CODES.LIMIT_REACHED,
        used,
        limit,
      },
    ),

  /**
   * 402, not 403: this is a "not on your plan" wall, and the client routes a 402
   * to the billing/upgrade page rather than showing a generic access error.
   */
  featureNotAvailable: (label: string) =>
    new ApiError(
      `${label} is not included in your current plan. Upgrade to enable it.`,
      HTTP_STATUS.PAYMENT_REQUIRED,
      true,
      {
        code: ERROR_CODES.FEATURE_NOT_AVAILABLE,
      },
    ),
};

/**
 * System Errors (500, 503)
 */
const system = {
  internal: (message = "Internal server error") =>
    new ApiError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      code: ERROR_CODES.INTERNAL_ERROR,
    }),

  unavailable: (message = "Service unavailable") =>
    new ApiError(message, HTTP_STATUS.SERVICE_UNAVAILABLE, false, {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    }),

  tooManyRequests: (message = "Too many requests") =>
    new ApiError(message, HTTP_STATUS.TOO_MANY_REQUESTS, true, {
      code: ERROR_CODES.RATE_LIMIT,
    }),
};

export const AppError = {
  authentication,
  authorization,
  validation,
  resource,
  database,
  business,
  billing,
  system,
};
