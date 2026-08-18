import { Request, Response } from "express";
import { logger } from "../../config/logger";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { prospectService } from "./prospect.service";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { ProspectFilterSchema } from "../../contracts/validation";

/** Whitelisted prospect fields captured in audit snapshots. */
const AUDITED_PROSPECT_FIELDS = [
  "id",
  "prospectNo",
  "stage",
  "assignedToId",
] as const;

export const prospectController = {
  getProspects: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;

    const organizationId = req.organizationId!;

    const query = ProspectFilterSchema.parse(req.query);
    const result = await prospectService.getProspects(
      query,
      user,
      organizationId,
    );

    return ApiResponse.ok(
      res,
      result.data,
      "Prospects fetched successfully",
      result.meta,
    );
  }),

  getProspectById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const prospect = await prospectService.getProspectById(
      id,
      user,
      organizationId,
    );

    return ApiResponse.ok(res, prospect, "Prospect fetched successfully");
  }),

  convertLeadToProspect: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    // Middleware (validateData) already parsed req.body
    const { isNew, prospect } = await prospectService.convertLeadToProspect(
      req.body,
      user,
      organizationId,
    );

    logger.info(
      isNew
        ? "Lead converted to prospect"
        : "Lead conversion idempotency triggered",
      {
        organizationId,
        leadId: req.body.leadId,
        prospectId: prospect.id,
      },
    );

    const message = isNew
      ? "Lead converted to prospect successfully"
      : "Lead is already a prospect";

    // Only a genuinely new prospect is an event; re-converting is idempotent.
    if (isNew) {
      await recordAudit(req, {
        action: "PROSPECT_CREATED",
        entityType: "PROSPECT",
        entityId: prospect.id,
        organizationId,
        after: {
          ...pickFields(prospect, AUDITED_PROSPECT_FIELDS),
          fromLeadId: req.body.leadId,
        },
      });
    }

    return isNew
      ? ApiResponse.created(res, prospect, message)
      : ApiResponse.ok(res, prospect, message);
  }),

  updateProspect: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    // Middleware (validateData) already parsed req.body
    const result = await prospectService.updateProspect(
      id,
      req.body,
      user,
      organizationId,
    );

    await recordAudit(req, {
      action: "PROSPECT_UPDATED",
      entityType: "PROSPECT",
      entityId: id,
      organizationId,
      after: { fields: Object.keys(req.body ?? {}) },
    });

    return ApiResponse.ok(res, result, "Prospect updated successfully");
  }),

  updateStage: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    // Middleware (validateData) already parsed req.body
    const result = await prospectService.updateStage(
      id,
      req.body,
      user,
      organizationId,
    );

    return ApiResponse.ok(res, result, "Prospect stage updated successfully");
  }),

  updateFollowUp: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const result = await prospectService.updateFollowUp(
      id,
      req.body,
      user,
      organizationId,
    );

    return ApiResponse.ok(
      res,
      result,
      "Prospect follow-up updated successfully",
    );
  }),

  createActivity: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const activity = await prospectService.createActivity(
      id,
      req.body,
      user,
      organizationId,
    );

    return ApiResponse.created(
      res,
      activity,
      "Prospect activity created successfully",
    );
  }),

  deleteProspect: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Prospect ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    await prospectService.deleteProspect(id, user, organizationId);

    await recordAudit(req, {
      action: "PROSPECT_DELETED",
      entityType: "PROSPECT",
      entityId: id,
      organizationId,
    });

    return ApiResponse.ok(res, null, "Prospect deleted successfully");
  }),

  getCustomerStats: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const result = await prospectService.getCustomerStats(
      user,
      organizationId,
    );

    return ApiResponse.ok(
      res,
      result,
      "Customer stats fetched successfully",
    );
  }),
};
