import { Request, Response } from "express";
import { notificationService } from "./notification.service";
import { ApiResponse } from "../../utils/response/response";
import { AppError } from "../../utils/errors/appError";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { NotificationFeedSchema } from "../../contracts/validation";

/**
 * Notification Controller - HTTP boundary for per-user notifications.
 *
 * Every route is implicitly scoped to the calling user; there is no admin view
 * and no cross-user read. Deliberately not audited — these are per-user, high
 * volume, and record no decision anyone made.
 */

const requireReader = (req: Request) => {
  if (!req.user) {
    throw AppError.authentication.unauthorized("User not authenticated");
  }

  return {
    id: req.user.id,
    organizationId: req.user.organizationId,
  };
};

const requireIdParam = (req: Request): string => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    throw AppError.validation.badRequest("Valid Notification ID is required");
  }

  return id;
};

// GET /notifications - My notifications, newest first
const getFeed = asyncHandler(async (req: Request, res: Response) => {
  const query = NotificationFeedSchema.parse(req.query);
  const reader = requireReader(req);

  const result = await notificationService.getFeed(query, reader);

  return ApiResponse.ok(
    res,
    result.data,
    "Notifications retrieved",
    result.meta as never,
  );
});

// PATCH /notifications/:id/read
const markRead = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const reader = requireReader(req);

  const result = await notificationService.markRead(id, reader);

  return ApiResponse.ok(res, result, "Notification marked as read");
});

// PATCH /notifications/read-all
const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const reader = requireReader(req);

  const result = await notificationService.markAllRead(reader);

  return ApiResponse.ok(res, result, "All notifications marked as read");
});

// DELETE /notifications/:id
const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = requireIdParam(req);
  const reader = requireReader(req);

  const result = await notificationService.remove(id, reader);

  return ApiResponse.ok(res, result, "Notification deleted");
});

export const notificationController = {
  getFeed,
  markRead,
  markAllRead,
  remove,
};
