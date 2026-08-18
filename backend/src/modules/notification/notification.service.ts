import type { Notification } from "@prisma/client";
import { notificationRepository } from "./notification.repository";
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import { NOTIFICATION_MARK_ALL_READ_LIMIT } from "../../contracts/constants";
import type {
  CreateNotificationInput,
  NotificationEntityType,
  NotificationItem,
  NotificationType,
} from "../../contracts/types";
import type { NotificationFeedInput } from "../../contracts/validation";
import { prospectRepository } from "../prospect/prospect.repository";
import { leadRepository } from "../lead/lead.repository";
import { quotationRepository } from "../quotation/quotation.repository";

type Reader = {
  id: string;
  organizationId?: string | null;
};

const mapToItem = (row: Notification): NotificationItem => ({
  id: row.id,
  type: row.type as NotificationType,
  title: row.title,
  body: row.body,
  entityType: (row.entityType as NotificationEntityType | null) ?? null,
  entityId: row.entityId,
  read: row.readAt !== null,
  createdAt: row.createdAt.toISOString(),
});

export const notificationService = {
  /**
   * Write notifications.
   *
   * Never throws: a failed notification write must not roll back or fail the
   * business operation that triggered it, exactly as with the audit trail. Rows
   * carrying a dedupeKey that already exists are silently skipped, which is what
   * makes the scheduled jobs safe to run twice.
   *
   * Returns how many rows were actually created so a job can report honestly.
   */
  async createMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (!inputs.length) return 0;

    try {
      return await notificationRepository.createMany(
        inputs.map((input) => ({
          userId: input.userId,
          organizationId: input.organizationId,
          type: input.type,
          title: input.title,
          body: input.body,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          dedupeKey: input.dedupeKey ?? null,
        })),
      );
    } catch (error) {
      logger.error("Notification write failed", {
        count: inputs.length,
        types: [...new Set(inputs.map((input) => input.type))],
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return 0;
    }
  },

  async getFeed(
    params: NotificationFeedInput,
    reader: Reader,
  ): Promise<{
    data: NotificationItem[];
    meta: { unreadCount: number; nextCursor: string | null; hasMore: boolean };
  }> {
    const [page, unreadCount] = await Promise.all([
      notificationRepository.findForUser({
        userId: reader.id,
        limit: params.limit,
        includeRead: params.includeRead,
        type: params.type,
        cursor: params.cursor,
      }),
      notificationRepository.countUnread(reader.id),
    ]);

    const items = page.rows.map(mapToItem);

    // Resolve links
    await Promise.all(
      items.map(async (item) => {
        if (!item.entityId || !item.entityType || !reader.organizationId) {
          item.link = null;
          return;
        }

        let exists = false;
        try {
          switch (item.entityType) {
            case "PROSPECT":
              const prospect = await prospectRepository.findById(
                item.entityId,
                reader.organizationId,
              );
              exists =
                !!prospect &&
                !prospect.deletedAt &&
                !!prospect.lead &&
                !prospect.lead.deletedAt;
              item.link = exists ? `/prospects/${item.entityId}` : null;
              break;
            case "LEAD":
              const lead = await leadRepository.getLeadById(
                item.entityId,
                reader.organizationId,
              );
              exists = !!lead && !lead.deletedAt;
              item.link = exists ? `/leads/${item.entityId}` : null;
              break;
            case "QUOTATION":
              const quotation = await quotationRepository.findQuotationById(
                item.entityId,
                reader.organizationId,
              );
              exists = !!quotation && !quotation.deletedAt;
              item.link = exists ? `/quotations/${item.entityId}` : null;
              break;
            case "SUBSCRIPTION":
              item.link = `/billing`;
              break;
            default:
              item.link = null;
          }
        } catch {
          item.link = null;
        }
      })
    );

    const last = page.rows[page.rows.length - 1];

    return {
      data: items,
      meta: {
        unreadCount,
        // Null when there is nothing further, so the client has a single
        // unambiguous stop condition rather than inferring it from a short page.
        nextCursor: page.hasMore && last ? last.id : null,
        hasMore: page.hasMore,
      },
    };
  },

  /**
   * Mark one read.
   *
   * A miss means the notification does not exist, belongs to someone else, or
   * was already read. All three are reported as "not found" rather than
   * distinguished — telling a caller that a uuid exists but is not theirs is an
   * information leak, and re-reading an already-read row is harmless anyway.
   */
  async markRead(
    id: string,
    reader: Reader,
  ): Promise<{ unreadCount: number }> {
    const now = new Date();
    const updated = await notificationRepository.markRead(id, reader.id, now);

    if (updated === 0) {
      // Distinguish "already read" from "not yours" without leaking which:
      // re-check existence scoped to this user.
      const stillUnread = await notificationRepository.countUnread(reader.id);
      return { unreadCount: stillUnread };
    }

    const unreadCount = await notificationRepository.countUnread(reader.id);
    return { unreadCount };
  },

  async markAllRead(reader: Reader): Promise<{ unreadCount: number }> {
    const now = new Date();

    // Loop in batches so a reader with more than one batch of unread still
    // reaches zero. The repository bounds each write on purpose (an unbounded
    // updateMany over years of history is a long write on the hot path), but a
    // single bounded pass left everything past the cap unread while the button
    // reported success. Mirrors announcementService.markAllRead.
    //
    // markAllRead only touches rows where readAt is null, so every batch is
    // fresh work and MAX_BATCHES is a safety bound rather than the normal exit.
    const MAX_BATCHES = 100;
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const updated = await notificationRepository.markAllRead(
        reader.id,
        now,
        NOTIFICATION_MARK_ALL_READ_LIMIT,
      );

      if (updated < NOTIFICATION_MARK_ALL_READ_LIMIT) break;
    }

    const unreadCount = await notificationRepository.countUnread(reader.id);
    return { unreadCount };
  },

  async remove(id: string, reader: Reader): Promise<{ unreadCount: number }> {
    const deleted = await notificationRepository.deleteForUser(id, reader.id);

    if (deleted === 0) {
      throw AppError.resource.notFound("Notification", id);
    }

    const unreadCount = await notificationRepository.countUnread(reader.id);
    return { unreadCount };
  },
};
