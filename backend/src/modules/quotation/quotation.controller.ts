import { Request, Response } from "express";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { quotationService } from "./quotation.service";

/** Whitelisted quotation fields captured in audit snapshots. */
const AUDITED_QUOTATION_FIELDS = [
  "id",
  "quotationNo",
  "refNo",
  "status",
  "assignedToId",
  "prospectId",
  "grandTotal",
] as const;
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import {
  CreateQuotationSchema,
  QuotationFilterSchema,
  UpdateQuotationSchema,
} from "../../contracts/validation";

export const quotationController = {
  getQuotationStats: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;
    const stats = await quotationService.getQuotationStats(user, organizationId);

    return ApiResponse.ok(res, stats, "Quotation statistics fetched successfully");
  }),

  getQuotations: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const query = QuotationFilterSchema.parse(req.query);
    const result = await quotationService.getQuotations(
      query,
      user,
      organizationId,
    );

    logger.info("Quotations fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
      count: result.data.length,
    });

    return ApiResponse.ok(
      res,
      result.data,
      "Quotations fetched successfully",
      result.meta,
    );
  }),

  getQuotationById: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Quotation ID is required");
    }

    const quotation = await quotationService.getQuotationById(id, user, organizationId);

    logger.info("Quotation fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
      quotationId: id,
    });

    return ApiResponse.ok(res, quotation, "Quotation fetched successfully");
  }),

  createQuotation: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const data = CreateQuotationSchema.parse(req.body);
    const quotation = await quotationService.createQuotation(
      data,
      user,
      organizationId,
    );

    logger.info("Quotation created", {
      userId: user.id,
      role: user.role,
      organizationId,
      quotationId: quotation.id,
    });

    await recordAudit(req, {
      action: "QUOTATION_CREATED",
      entityType: "QUOTATION",
      entityId: quotation.id,
      organizationId,
      after: pickFields(quotation, AUDITED_QUOTATION_FIELDS),
    });

    return ApiResponse.created(res, quotation, "Quotation created successfully");
  }),

  updateQuotation: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Quotation ID is required");
    }

    const data = UpdateQuotationSchema.parse(req.body);
    const previousQuotation = await quotationService.getQuotationById(
      id,
      user,
      organizationId,
    );
    const quotation = await quotationService.updateQuotation(
      id,
      data,
      user,
      organizationId,
    );

    logger.info("Quotation updated", {
      userId: user.id,
      role: user.role,
      organizationId,
      quotationId: id,
    });

    await recordAudit(req, {
      // A status move is the commercially interesting event; separate it from a
      // routine field edit.
      action:
        previousQuotation.status !== quotation.status
          ? "QUOTATION_STATUS_CHANGED"
          : "QUOTATION_UPDATED",
      entityType: "QUOTATION",
      entityId: id,
      organizationId,
      before: pickFields(previousQuotation, AUDITED_QUOTATION_FIELDS),
      after: pickFields(quotation, AUDITED_QUOTATION_FIELDS),
    });

    return ApiResponse.ok(res, quotation, "Quotation updated successfully");
  }),

  deleteQuotation: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Quotation ID is required");
    }

    const previousQuotation = await quotationService.getQuotationById(
      id,
      user,
      organizationId,
    );
    await quotationService.softDeleteQuotation(id, user, organizationId);

    logger.info("Quotation deleted", {
      userId: user.id,
      role: user.role,
      organizationId,
      quotationId: id,
    });

    await recordAudit(req, {
      action: "QUOTATION_DELETED",
      entityType: "QUOTATION",
      entityId: id,
      organizationId,
      before: pickFields(previousQuotation, AUDITED_QUOTATION_FIELDS),
    });

    return ApiResponse.ok(res, null, "Quotation deleted successfully");
  }),
};
