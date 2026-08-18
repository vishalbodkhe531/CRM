/**
 * Centralized Error Types for the Application
 * All custom errors should extend this base ApiError class
 */

import { ZodIssue } from "zod";
import { HTTP_STATUS } from "../constants/http-status.constants";

export { HTTP_STATUS }; // Re-export for convenience

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown; // Can be ZodIssue[] or custom error metadata

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = this.constructor.name;

    // Capture stack trace for logging (but don't expose in production)
    Error.captureStackTrace(this, this.constructor);
  }
}
