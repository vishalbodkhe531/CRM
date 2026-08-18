import { Prisma } from "@prisma/client";
import { prisma, DB } from "../../config/db";

/**
 * Notification Repository
 *
 * Per-user rows. There is no cross-tenant read path here at all — a
 * notification belongs to exactly one user, and every query is pinned to them.
 */

export interface NotificationFindOptions {
  userId: string;
  limit: number;
  includeRead: boolean;
  type?: string;
  /**
   * Id of the last row the caller already has. Rows strictly older than it are
   * returned — see findForUser for why this is a keyset rather than an offset.
   */
  cursor?: string;
}

export const notificationRepository = {
  /**
   * Bulk insert, skipping rows whose dedupeKey already exists.
   *
   * This is the idempotency guarantee the scheduled jobs rely on: a second run
   * inserts the same keys and Postgres drops them, so nobody is notified twice.
   * Returns the number actually written.
   */
  createMany: async (
    data: Prisma.NotificationCreateManyInput[],
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;
    if (!data.length) return 0;

    const result = await db.notification.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  },

  create: async (data: Prisma.NotificationUncheckedCreateInput, tx?: DB) => {
    const db = tx || prisma;
    return db.notification.create({ data });
  },

  /**
   * One page of a user's feed, newest first.
   *
   * Paged by cursor rather than offset: notifications arrive while somebody is
   * reading, and every new row shifts an offset window by one — so page 2 would
   * repeat rows the user just saw on page 1. A keyset anchored to a row they
   * already have is stable no matter what arrives above it.
   *
   * `id` breaks ties on createdAt because bulk jobs write many rows in the same
   * millisecond; without it a page boundary landing inside such a group would
   * drop or duplicate rows.
   *
   * Fetches limit + 1 and reports `hasMore` from the extra row, so the caller
   * learns whether another page exists without a second COUNT over the table.
   */
  findForUser: async (options: NotificationFindOptions, tx?: DB) => {
    const db = tx || prisma;

    const where: Prisma.NotificationWhereInput = { userId: options.userId };

    if (!options.includeRead) {
      where.readAt = null;
    }

    if (options.type) {
      where.type = options.type;
    }

    if (options.cursor) {
      const anchor = await db.notification.findFirst({
        where: { id: options.cursor, userId: options.userId },
        select: { id: true, createdAt: true },
      });

      // An unknown or someone else's cursor restarts from the top rather than
      // erroring: the feed is a convenience surface, and a stale cursor after a
      // deletion is normal.
      if (anchor) {
        where.OR = [
          { createdAt: { lt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { lt: anchor.id } },
        ];
      }
    }

    const rows = await db.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;

    return { rows: hasMore ? rows.slice(0, options.limit) : rows, hasMore };
  },

  countUnread: async (userId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.notification.count({ where: { userId, readAt: null } });
  },

  /**
   * Mark one as read.
   *
   * Scoped by userId in the WHERE rather than by id alone: without it any
   * authenticated user could mark another user's notifications read by guessing
   * a uuid. updateMany returns a count, so a miss is a 0 rather than a throw.
   */
  markRead: async (
    id: string,
    userId: string,
    readAt: Date,
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;

    const result = await db.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt },
    });

    return result.count;
  },

  markAllRead: async (
    userId: string,
    readAt: Date,
    limit: number,
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;

    // Bound the update by selecting ids first — an unbounded updateMany on a
    // user with years of history is a long-running write on the hot path.
    const rows = await db.notification.findMany({
      where: { userId, readAt: null },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (!rows.length) return 0;

    const result = await db.notification.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { readAt },
    });

    return result.count;
  },

  deleteForUser: async (
    id: string,
    userId: string,
    tx?: DB,
  ): Promise<number> => {
    const db = tx || prisma;
    const result = await db.notification.deleteMany({ where: { id, userId } });
    return result.count;
  },
};
