import fs from "fs/promises";
import path from "path";
import type { Request } from "express";
import { logger } from "../../config/logger";

/**
 * Lifecycle helpers for files written to disk by multer.
 *
 * Multer has to run before validation — Express cannot populate `req.body` from
 * a multipart request until it does — so a request carrying a valid file and an
 * invalid body writes the file and then fails. Nothing deleted those files, and
 * nothing deleted the file an upload replaced, so `uploads/` only ever grew.
 */

/** Where uploads live on disk. Multer's `destination` is relative to this. */
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * Disk path -> the URL the frontend requests.
 *
 * Derived from `file.path` rather than reassembled from a folder constant.
 * Rebuilding it by hand is what produced
 * `/uploads/organizations/uploads/organizations/logos/<file>` on the profile
 * route, where the interpolated "folder" was already a full path.
 */
export const toPublicUploadPath = (file: Express.Multer.File): string =>
  `/${path.relative(process.cwd(), file.path).split(path.sep).join("/")}`;

/** Every file multer attached to this request, whether `.single` or `.fields`. */
const uploadedFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) return [req.file];
  if (!req.files) return [];

  return Array.isArray(req.files)
    ? req.files
    : Object.values(req.files).flat();
};

/**
 * Delete a file that has been written but must not be kept.
 *
 * Never throws: cleanup runs on paths that are already failing, and losing the
 * original error to report a missing temp file would be a bad trade. A missing
 * file is the desired end state anyway.
 */
const unlinkQuietly = async (diskPath: string, reason: string) => {
  try {
    await fs.unlink(diskPath);
    logger.info("Removed upload", { diskPath, reason });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;

    logger.warn("Could not remove upload", { diskPath, reason, code });
  }
};

/** Discard everything multer wrote for a request that did not succeed. */
export const removeUploadedFiles = async (req: Request, reason: string) => {
  await Promise.all(
    uploadedFiles(req).map((file) => unlinkQuietly(file.path, reason)),
  );
};

/**
 * Delete an asset that has just been replaced, given the public path stored on
 * the record (e.g. `/uploads/organizations/logos/logo-1-2.png`).
 *
 * Refuses anything that resolves outside `uploads/`, so a malformed or crafted
 * value in the column cannot turn a profile update into an arbitrary delete.
 */
export const deleteStoredAsset = async (
  publicPath: string | null | undefined,
  reason: string,
) => {
  if (!publicPath) return;

  const relative = publicPath.replace(/^\/+/, "");
  const diskPath = path.resolve(process.cwd(), relative);

  if (
    diskPath !== UPLOAD_ROOT &&
    !diskPath.startsWith(`${UPLOAD_ROOT}${path.sep}`)
  ) {
    logger.warn("Refused to delete asset outside the uploads directory", {
      publicPath,
    });
    return;
  }

  await unlinkQuietly(diskPath, reason);
};
