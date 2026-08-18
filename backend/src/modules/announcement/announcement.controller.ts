import { Request, Response } from "express";
import { announcementService } from "./announcement.service";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { logger } from "../../config/logger";
import { recordAudit } from "../../utils/audit/recordAudit";
import { pickFields } from "../audit/audit.service";
import {
  AnnouncementFeedSchema,
  AnnouncementFilterSchema,
} from "../../contracts/validation";
import type { AnnouncementListItem } from "../../contracts/types";

/**
 * Announcement Controller - HTTP boundary for broadcasts.
 *
 * The viewer surface (feed, read, dismiss) is open to any authenticated user;
 * the authoring surface is permission-gated at the route and scope-gated in the
 * service.
 */

/** Whitelisted announcement fields captured in audit snapshots. */
const AUDITED_ANNOUNCEMENT_FIELDS = [
  "id",
  "title",
  "severity",
  "placement",
  "scope",
  "status",
  "organizationId",
  "targetOrganizationIds",
  "targetRoles",
  "publishAt",
  "expiresAt",
  "dismissible",
] as const;

const auditSnapshot = (announcement: AnnouncementListItem) =>
  pickFields(announcement, AUDITED_ANNOUNCEMENT_FIELDS);

/**
 * Narrow the :id route param.
 *
 * Express 5 types params as `string | string[]`, so every handler has to prove
 * it is a single value before passing it on.
 */
const requireIdParam = (req: Request): string => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Announcement ID is required");
  }

  return id;
};

/** Actor identity for the service layer. Throws rather than returning a partial actor. */
const requireActor = (req: Request) => {
  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  return {
    id: req.user.id,
    role: req.user.role,
    organizationId: req.user.organizationId,
  };
};

// ============================= Viewer surface =============================

// GET /announcements/feed - Announcements visible to me, plus my unread count
const getFeed = asyncHandler(async (req: Request, res: Response) => {
  const query = AnnouncementFeedSchema.parse(req.query);
  const actor = requireActor(req);

  const result = await announcementService.getFeed(query, actor);

  return ApiResponse.ok(
    res,
    result.data,
    "Announcement feed retrieved",
    result.meta as never,
  );
});

// POST /announcements/read-all - Mark every currently visible announcement read
const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);

  const result = await announcementService.markAllRead(actor);

  return ApiResponse.ok(res, result, "All announcements marked as read");
});

// POST /announcements/:id/read - Mark one announcement read
const markRead = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const result = await announcementService.recordReceipt(id, actor, "read");

  return ApiResponse.ok(res, result, "Announcement marked as read");
});

// POST /announcements/:id/dismiss - Dismiss one announcement for me only
const dismiss = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const result = await announcementService.recordReceipt(id, actor, "dismiss");

  return ApiResponse.ok(res, result, "Announcement dismissed");
});

// ============================ Authoring surface ============================

// GET /announcements - Management list
const getAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const query = AnnouncementFilterSchema.parse(req.query);
  const actor = requireActor(req);

  const result = await announcementService.getAnnouncements(query, actor);

  return ApiResponse.ok(
    res,
    result.data,
    "Announcements retrieved",
    result.meta,
  );
});

// GET /announcements/:id - Single announcement
const getAnnouncementById = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const announcement = await announcementService.getAnnouncementById(id, actor);

  return ApiResponse.ok(res, announcement, "Announcement retrieved");
});

// POST /announcements - Create (always as a DRAFT)
const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const actor = requireActor(req);

  const announcement = await announcementService.createAnnouncement(
    req.body,
    actor,
  );

  logger.info("Announcement created", {
    userId: actor.id,
    announcementId: announcement.id,
    scope: announcement.scope,
  });

  await recordAudit(req, {
    action: "ANNOUNCEMENT_CREATED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    organizationId: announcement.organizationId,
    after: auditSnapshot(announcement),
  });

  return ApiResponse.created(res, announcement, "Announcement created");
});

// PATCH /announcements/:id - Update
const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const before = await announcementService.getAnnouncementById(id, actor);
  const announcement = await announcementService.updateAnnouncement(
    id,
    req.body,
    actor,
  );

  await recordAudit(req, {
    action: "ANNOUNCEMENT_UPDATED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    organizationId: announcement.organizationId,
    before: auditSnapshot(before),
    after: auditSnapshot(announcement),
  });

  return ApiResponse.ok(res, announcement, "Announcement updated");
});

// POST /announcements/:id/publish - Make it live
const publishAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const before = await announcementService.getAnnouncementById(id, actor);
  const announcement = await announcementService.publishAnnouncement(id, actor);

  logger.info("Announcement published", {
    userId: actor.id,
    announcementId: announcement.id,
    scope: announcement.scope,
    isLive: announcement.isLive,
  });

  await recordAudit(req, {
    action: "ANNOUNCEMENT_PUBLISHED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    organizationId: announcement.organizationId,
    before: auditSnapshot(before),
    after: auditSnapshot(announcement),
  });

  return ApiResponse.ok(res, announcement, "Announcement published");
});

// POST /announcements/:id/archive - Take it out of circulation
const archiveAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const before = await announcementService.getAnnouncementById(id, actor);
  const announcement = await announcementService.archiveAnnouncement(id, actor);

  await recordAudit(req, {
    action: "ANNOUNCEMENT_ARCHIVED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    organizationId: announcement.organizationId,
    before: auditSnapshot(before),
    after: auditSnapshot(announcement),
  });

  return ApiResponse.ok(res, announcement, "Announcement archived");
});

// DELETE /announcements/:id - Soft delete
const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const actor = requireActor(req);

  const announcement = await announcementService.deleteAnnouncement(id, actor);

  await recordAudit(req, {
    action: "ANNOUNCEMENT_DELETED",
    entityType: "ANNOUNCEMENT",
    entityId: announcement.id,
    organizationId: announcement.organizationId,
    before: auditSnapshot(announcement),
  });

  return ApiResponse.ok(res, announcement, "Announcement deleted");
});

export const announcementController = {
  getFeed,
  markAllRead,
  markRead,
  dismiss,
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  deleteAnnouncement,
};
