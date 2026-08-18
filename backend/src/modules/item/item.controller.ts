import { Request, Response } from "express";
import { ApiResponse } from "../../utils/response/response";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import { itemService } from "./item.service";

/** Whitelisted item fields captured in audit snapshots. */
const AUDITED_ITEM_FIELDS = [
  "id",
  "itemCode",
  "name",
  "itemType",
  "price",
  "gstRate",
  "status",
] as const;
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import {
  CreateItemSchema,
  ItemFilterSchema,
  UpdateItemSchema,
} from "../../contracts/validation";

/**
 * Item Controller - HTTP Boundary for Item Management
 */
export const itemController = {
  getItems: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const query = ItemFilterSchema.parse(req.query);
    const itemsResult = await itemService.getItems(
      query,
      organizationId,
    );

    logger.info("Items fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
      count: itemsResult.data.length,
    });

    return ApiResponse.ok(
      res,
      itemsResult.data,
      "Items fetched successfully",
      itemsResult.meta,
    );
  }),

  getItemById: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Item ID is required");
    }

    const item = await itemService.getItemById(id, organizationId);

    logger.info("Item fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
      itemId: id,
    });

    return ApiResponse.ok(res, item, "Item fetched successfully");
  }),

  createItem: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const data = CreateItemSchema.parse(req.body);
    const item = await itemService.createItem(
      data,
      user.id,
      organizationId,
    );

    logger.info("Item created", {
      userId: user.id,
      role: user.role,
      organizationId,
      itemId: item.id,
    });

    await recordAudit(req, {
      action: "ITEM_CREATED",
      entityType: "ITEM",
      entityId: item.id,
      organizationId,
      after: pickFields(item, AUDITED_ITEM_FIELDS),
    });

    return ApiResponse.created(res, item, "Item created successfully");
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Item ID is required");
    }

    const data = UpdateItemSchema.parse(req.body);
    const previousItem = await itemService.getItemById(id, organizationId);
    const item = await itemService.updateItem(
      id,
      data,
      organizationId,
    );

    logger.info("Item updated", {
      userId: user.id,
      role: user.role,
      organizationId,
      itemId: id,
    });

    await recordAudit(req, {
      action: "ITEM_UPDATED",
      entityType: "ITEM",
      entityId: id,
      organizationId,
      before: pickFields(previousItem, AUDITED_ITEM_FIELDS),
      after: pickFields(item, AUDITED_ITEM_FIELDS),
    });

    return ApiResponse.ok(res, item, "Item updated successfully");
  }),

  deleteItem: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Item ID is required");
    }

    const previousItem = await itemService.getItemById(id, organizationId);
    await itemService.deleteItem(id, organizationId, user.id);

    logger.info("Item deleted", {
      userId: user.id,
      role: user.role,
      organizationId,
      itemId: id,
    });

    await recordAudit(req, {
      action: "ITEM_DELETED",
      entityType: "ITEM",
      entityId: id,
      organizationId,
      before: pickFields(previousItem, AUDITED_ITEM_FIELDS),
    });

    return ApiResponse.ok(res, null, "Item deleted successfully");
  }),

  toggleItemStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw AppError.validation.badRequest("Item ID is required");
    }

    const updatedItem = await itemService.toggleItemStatus(
      id,
      organizationId,
    );

    logger.info("Item status toggled", {
      userId: user.id,
      role: user.role,
      organizationId,
      itemId: id,
      newStatus: updatedItem.status,
    });

    return ApiResponse.ok(res, updatedItem, "Item status updated");
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;

    const stats = await itemService.getItemStats(organizationId);

    logger.info("Item stats fetched", {
      userId: user.id,
      role: user.role,
      organizationId,
    });

    return ApiResponse.ok(res, stats, "Item stats fetched successfully");
  }),
};
