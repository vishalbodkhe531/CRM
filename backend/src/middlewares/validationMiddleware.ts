import { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/errors/appError";

type RequestPart = "body" | "params" | "query";

export const validateData =
  (schema: any, part: RequestPart = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const data = req[part];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.issues.map((issue: any) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw AppError.validation.badRequest("Validation failed", errors);
    }

    Reflect.set(req, part, result.data);
    next();
  };
