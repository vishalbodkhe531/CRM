import { NextFunction, Request, Response } from "express";
import { removeUploadedFiles } from "../utils/uploads/assetFiles";

/**
 * Discards files multer already wrote when the request goes on to fail.
 *
 * Mount immediately before the global error handler, so it sees every failure
 * that reaches it — a rejected Zod schema, a permission error, a service throw,
 * a rolled-back transaction — rather than only the one case it was written for.
 *
 * Deletion is fire-and-forget: the response must not wait on unlink, and a
 * cleanup problem must never replace the error the caller actually needs.
 */
export const cleanupUploadsOnError = (
  err: unknown,
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  void removeUploadedFiles(req, "request failed");
  next(err);
};
