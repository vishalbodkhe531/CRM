import { Request, Response } from "express";
import { platformSettingsService } from "./platformSettings.service";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import { recordAudit } from "../../utils/audit/recordAudit";
import { UpdatePlatformSettingsSchema } from "../../contracts/validation";

// GET /platform-settings - full settings (super-admin only)
const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await platformSettingsService.getSettings();
  return ApiResponse.ok(res, settings, "Platform settings retrieved");
});

// GET /platform-settings/public - the slice any signed-in user may read
const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await platformSettingsService.getPublicSettings();
  return ApiResponse.ok(res, settings, "Platform settings retrieved");
});

// PATCH /platform-settings - update (super-admin only)
const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.authentication.required();

  const data = UpdatePlatformSettingsSchema.parse(req.body);

  const before = await platformSettingsService.getSettings();
  const settings = await platformSettingsService.updateSettings(
    data,
    req.user.id,
  );

  /**
   * Platform settings change behaviour for every tenant at once, so the trail
   * records the values rather than only the field names — there is nothing
   * personal here, and "who lowered audit retention, from what, to what" is
   * exactly the question this row exists to answer.
   */
  await recordAudit(req, {
    action: "PLATFORM_SETTINGS_UPDATED",
    entityType: "PLATFORM",
    entityId: "platform",
    organizationId: null,
    before: { ...before },
    after: { ...settings },
  });

  logger.info("Platform settings updated", {
    userId: req.user.id,
    fields: Object.keys(data),
  });

  return ApiResponse.ok(res, settings, "Platform settings updated");
});

export const platformSettingsController = {
  getSettings,
  getPublicSettings,
  updateSettings,
};
