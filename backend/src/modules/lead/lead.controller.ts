import { Request, Response } from "express";
import { logger } from "../../config/logger";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { AppError } from "../../utils/errors/appError";
import { ApiResponse } from "../../utils/response/response";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { leadService } from "./lead.service";
import { deleteStoredAsset } from "../../utils/uploads/assetFiles";

/** Whitelisted lead fields captured in audit snapshots. Never spread the entity. */
const AUDITED_LEAD_FIELDS = [
  "id",
  "leadNo",
  "firstName",
  "lastName",
  "companyName",
  "email",
  "mobile",
  "status",
  "source",
  "leadType",
  "assignedToId",
] as const;
import {
  AssignLeadSchema,
  CreateLeadSchema,
  LeadFilterSchema,
  UpdateLeadStatusSchema,
  UpdateLeadSchema,
} from "../../contracts/validation";


export const leadController = {
  createLead: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;
    const data = CreateLeadSchema.parse(req.body);

    // Attach file URL if a profile picture was uploaded
    if (req.file) {
      data.profilePicture = `/uploads/leads/${req.file.filename}`;
    }

    const lead = await leadService.createLead(data, user, organizationId);

    logger.info("Lead created", {
      userId: user.id,
      organizationId,
      leadId: lead.id,
    });

    await recordAudit(req, {
      action: "LEAD_CREATED",
      entityType: "LEAD",
      entityId: lead.id,
      organizationId,
      after: pickFields(lead, AUDITED_LEAD_FIELDS),
    });

    return ApiResponse.created(res, lead, "Lead created successfully");
  }),

  getLeadById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const lead = await leadService.getLeadById(id, user, organizationId);

    logger.info("Lead fetched", {
      userId: user.id,
      organizationId,
      leadId: id,
    });

    return ApiResponse.ok(res, lead, "Lead fetched successfully");
  }),

  updateLead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const data = UpdateLeadSchema.parse(req.body);

    if (req.file) {
      data.profilePicture = `/uploads/leads/${req.file.filename}`;
    }

    const previousLead = await leadService.getLeadById(id, user, organizationId);
    const updatedLead = await leadService.updateLead(
      id,
      data,
      user,
      organizationId
    );

    if (req.file && previousLead.profilePicture) {
      await deleteStoredAsset(previousLead.profilePicture, "Lead profile picture replaced");
    }

    logger.info("Lead updated", {
      userId: user.id,
      organizationId,
      leadId: id,
    });

    await recordAudit(req, {
      action: "LEAD_UPDATED",
      entityType: "LEAD",
      entityId: id,
      organizationId,
      before: pickFields(previousLead, AUDITED_LEAD_FIELDS),
      after: pickFields(updatedLead, AUDITED_LEAD_FIELDS),
    });

    return ApiResponse.ok(res, updatedLead, "Lead updated successfully");
  }),

  updateLeadStatus: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;
    const data = UpdateLeadStatusSchema.parse(req.body);

    const previousLead = await leadService.getLeadById(id, user, organizationId);
    const result = await leadService.updateLeadStatus(
      id,
      data,
      user,
      organizationId,
    );

    logger.info("Lead status updated", {
      userId: user.id,
      organizationId,
      leadId: id,
    });

    await recordAudit(req, {
      action: "LEAD_STATUS_CHANGED",
      entityType: "LEAD",
      entityId: id,
      organizationId,
      before: { status: previousLead.status },
      after: { status: result.lead.status },
    });

    if (result.prospect?.isNew) {
      await recordAudit(req, {
        action: "LEAD_CONVERTED",
        entityType: "LEAD",
        entityId: id,
        organizationId,
        after: { prospectId: result.prospect.id },
      });
    }

    return ApiResponse.ok(
      res,
      result.lead,
      result.message,
      result.prospect ? { prospect: result.prospect } : undefined,
    );
  }),

  softDeleteLead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;

    const previousLead = await leadService.getLeadById(id, user, organizationId);
    await leadService.softDeleteLead(id, user, organizationId);

    logger.info("Lead deleted", {
      userId: user.id,
      organizationId,
      leadId: id,
    });

    await recordAudit(req, {
      action: "LEAD_DELETED",
      entityType: "LEAD",
      entityId: id,
      organizationId,
      before: pickFields(previousLead, AUDITED_LEAD_FIELDS),
    });

    return ApiResponse.ok(res, null, "Lead deleted successfully");
  }),

  convertLeadToProspect: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;
    const data = req.body;

    const { isNew, prospect } = await leadService.convertLeadToProspect(
      id,
      data,
      user,
      organizationId,
    );

    logger.info(
      isNew
        ? "Lead converted to prospect"
        : "Lead conversion idempotency triggered",
      {
        userId: user.id,
        organizationId,
        leadId: id,
        prospectId: prospect.id,
      },
    );

    const message = isNew
      ? "Lead converted to prospect successfully"
      : "Lead is already a prospect";

    // Only record when a NEW prospect was actually created — re-hitting convert
    // on an already-converted lead is idempotent and not an event.
    if (isNew) {
      await recordAudit(req, {
        action: "LEAD_CONVERTED",
        entityType: "LEAD",
        entityId: id,
        organizationId,
        after: { prospectId: prospect.id },
      });
    }

    return isNew
      ? ApiResponse.created(res, prospect, message)
      : ApiResponse.ok(res, prospect, message);
  }),

  assignLead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || id.length === 0) {
      throw AppError.validation.badRequest("Valid Lead ID is required");
    }

    const user = req.user!;
    const organizationId = req.organizationId!;
    const { executiveId } = AssignLeadSchema.parse(req.body);

    const updatedLead = await leadService.assignLead(
      id,
      executiveId,
      user.id,
      user,
      organizationId,
    );

    logger.info("Lead assigned", {
      userId: user.id,
      organizationId,
      leadId: id,
      executiveId,
    });

    return ApiResponse.ok(res, updatedLead, "Lead assigned successfully");
  }),

  getLeads: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;
    const query = LeadFilterSchema.parse(req.query);
    const leads = await leadService.getLeads(query, user, organizationId);

    logger.info("Leads fetched", {
      userId: user.id,
      organizationId,
      count: leads.data.length,
    });

    return ApiResponse.ok(
      res,
      leads.data,
      "Leads fetched successfully",
      leads.meta,
    );
  }),

  importLeads: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    if (!req.file) {
      throw AppError.validation.badRequest("Please upload an Excel file.");
    }

    const importResult = await leadService.importLeads(
      req.file.buffer,
      user,
      organizationId,
    );

    logger.info("Leads imported", {
      userId: user.id,
      organizationId,
      successCount: importResult.successCount,
      failedCount: importResult.failed.length,
    });

    // Bulk import is a single deliberate action; record one summary row rather
    // than one per lead (which would swamp the trail). No entityId — it spans
    // many leads.
    await recordAudit(req, {
      action: "LEAD_IMPORTED",
      entityType: "LEAD",
      organizationId,
      after: {
        imported: importResult.successCount,
        failed: importResult.failed.length,
        total: importResult.successCount + importResult.failed.length,
      },
    });

    const message =
      importResult.failed.length > 0
        ? `Import finished. ${importResult.successCount} leads imported successfully, ${importResult.failed.length} failed.`
        : `${importResult.successCount} Leads imported successfully`;

    return ApiResponse.created(res, importResult, message);
  }),

  getAssignableUsers: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const users = await leadService.getAssignableUsers(user, organizationId);

    return ApiResponse.ok(res, users, "Assignable users fetched successfully");
  }),
};
