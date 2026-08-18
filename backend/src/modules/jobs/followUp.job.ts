import { ProspectStage } from "@prisma/client";
import { prisma } from "../../config/db";
import { notificationService } from "../notification/notification.service";
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  REMINDER_OFFSET_MINUTES,
} from "../../contracts/constants";
import type { CreateNotificationInput } from "../../contracts/types";

/**
 * Follow-up reminder jobs.
 *
 * A follow-up's due moment is split across two columns: `followUpDate` holds the
 * date and `followUpTime` an "HH:mm" string. Postgres cannot combine those in a
 * WHERE clause without casting gymnastics, so both jobs fetch a coarse date
 * window and compute the exact moment in JS. The window is small — follow-ups
 * due in the next two days — so this stays cheap.
 */

const MS_PER_MINUTE = 60 * 1000;

/** Stages where a follow-up no longer matters. */
const CLOSED_STAGES: ProspectStage[] = [
  ProspectStage.WON,
  ProspectStage.LOST,
];

type ProspectRow = {
  id: string;
  prospectNo: string;
  organizationId: string;
  followUpDate: Date | null;
  followUpTime: string | null;
  followUpReminder: string | null;
  followUpAssignedToId: string | null;
  assignedToId: string | null;
  lead: { companyName: string | null } | null;
};

/**
 * Combine the date and "HH:mm" time into a single moment.
 *
 * A missing or malformed time is treated as start of day rather than discarded:
 * a follow-up with no time set is still a follow-up, and silently never
 * reminding anyone is the worse failure.
 */
const resolveDueAt = (row: ProspectRow): Date | null => {
  if (!row.followUpDate) return null;

  const dueAt = new Date(row.followUpDate);
  const match = /^(\d{1,2}):(\d{2})$/.exec(row.followUpTime ?? "");

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours <= 23 && minutes <= 59) {
      dueAt.setHours(hours, minutes, 0, 0);
      return dueAt;
    }
  }

  dueAt.setHours(0, 0, 0, 0);
  return dueAt;
};

const resolveRecipient = (row: ProspectRow): string | null =>
  row.followUpAssignedToId ?? row.assignedToId ?? null;

const describe = (row: ProspectRow) =>
  row.lead?.companyName?.trim() || row.prospectNo;

const fetchProspects = async (from: Date, to: Date): Promise<ProspectRow[]> =>
  prisma.prospect.findMany({
    where: {
      followUpDate: { gte: from, lte: to },
      stage: { notIn: CLOSED_STAGES },
      // A follow-up nobody owns cannot be reminded about.
      OR: [
        { followUpAssignedToId: { not: null } },
        { assignedToId: { not: null } },
      ],
    },
    select: {
      id: true,
      prospectNo: true,
      organizationId: true,
      followUpDate: true,
      followUpTime: true,
      followUpReminder: true,
      followUpAssignedToId: true,
      assignedToId: true,
      lead: { select: { companyName: true } },
    },
    // Bound the batch. A backlog is drained across successive runs rather than
    // turning one cron tick into an unbounded write.
    take: 1000,
  });

/**
 * Remind the owner shortly before a follow-up is due.
 *
 * Fires when now is inside [dueAt - reminderOffset, dueAt). The dedupe key
 * includes dueAt, so rescheduling a follow-up correctly produces a fresh
 * reminder while re-running the cron does not.
 */
export const runFollowUpReminders = async (now: Date) => {
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now.getTime() + 2 * 24 * 60 * MS_PER_MINUTE);

  const prospects = await fetchProspects(windowStart, windowEnd);
  const inputs: CreateNotificationInput[] = [];

  for (const row of prospects) {
    const dueAt = resolveDueAt(row);
    const userId = resolveRecipient(row);
    if (!dueAt || !userId) continue;

    const offsetMinutes =
      REMINDER_OFFSET_MINUTES[row.followUpReminder ?? ""] ??
      DEFAULT_REMINDER_OFFSET_MINUTES;

    const remindAt = new Date(dueAt.getTime() - offsetMinutes * MS_PER_MINUTE);

    // Not yet time, or already past due (runFollowUpOverdue owns that case).
    if (now < remindAt || now >= dueAt) continue;

    const dueLabel = dueAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    inputs.push({
      userId,
      organizationId: row.organizationId,
      type: "FOLLOW_UP_DUE",
      title: "Follow-up due soon",
      body: `Your follow-up with ${describe(row)} is due at ${dueLabel}.`,
      entityType: "PROSPECT",
      entityId: row.id,
      dedupeKey: `FOLLOW_UP_DUE:${row.id}:${dueAt.toISOString()}`,
    });
  }

  const created = await notificationService.createMany(inputs);
  return { created, skipped: inputs.length - created };
};

/**
 * Tell the owner a follow-up was missed.
 *
 * Looks back a bounded number of days rather than over all history — resurfacing
 * a follow-up missed six months ago helps nobody, and the dedupe key means a
 * genuinely missed one is announced exactly once anyway.
 */
export const runFollowUpOverdue = async (now: Date, lookbackDays = 3) => {
  const windowStart = new Date(now.getTime() - lookbackDays * 24 * 60 * MS_PER_MINUTE);
  windowStart.setHours(0, 0, 0, 0);

  const prospects = await fetchProspects(windowStart, now);
  const inputs: CreateNotificationInput[] = [];

  for (const row of prospects) {
    const dueAt = resolveDueAt(row);
    const userId = resolveRecipient(row);
    if (!dueAt || !userId) continue;

    if (dueAt >= now) continue;

    const dueLabel = dueAt.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    inputs.push({
      userId,
      organizationId: row.organizationId,
      type: "FOLLOW_UP_OVERDUE",
      title: "Follow-up overdue",
      body: `Your follow-up with ${describe(row)} was due on ${dueLabel}.`,
      entityType: "PROSPECT",
      entityId: row.id,
      dedupeKey: `FOLLOW_UP_OVERDUE:${row.id}:${dueAt.toISOString()}`,
    });
  }

  const created = await notificationService.createMany(inputs);
  return { created, skipped: inputs.length - created };
};
