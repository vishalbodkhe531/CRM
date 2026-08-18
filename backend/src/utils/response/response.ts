import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ResponseMeta = PaginationMeta | Record<string, unknown>;

/**
 * Standardized JSON envelope for all API responses.
 */
export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T | null;
  public readonly meta?: ResponseMeta;
  public readonly errors?: unknown[];

  constructor(
    success: boolean,
    statusCode: number,
    message: string,
    data: T | null = null,
    meta?: ResponseMeta,
    errors?: unknown[],
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.errors = errors;
  }

  static ok<T>(res: Response, data: T, message = "Success", meta?: ResponseMeta): void {
    const response = new ApiResponse(true, 200, message, data, meta);
    res.status(200).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message = "Resource created successfully",
    meta?: ResponseMeta
  ): void {
    const response = new ApiResponse(true, 201, message, data, meta);
    res.status(201).json(response);
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors?: unknown[],
  ): void {
    const response = new ApiResponse(false, statusCode, message, null, undefined, errors);
    res.status(statusCode).json(response);
  }
}
