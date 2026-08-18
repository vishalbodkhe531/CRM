import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { notificationService } from "../notification/notification.service";
import { resolveSubscriptionState } from "../../utils/business/subscription.utils";
import { TRIAL_WARNING_DAYS } from "../../contracts/constants";
import type {
  CreateNotificationInput,
  NotificationType,
} from "../../contracts/types";

/**
 * Subscription warning job.
 *
 * The read-time resolver (resolveSubscriptionState) remains the authority on
 * ACCESS — a lapsed tenant is blocked whether or not this job ever runs. This
 * job only PUSHES the news, so that somebody finds out before they discover it
 * by being refused.
 *
 * Sends to organization admins only: an executive can do nothing about a lapsed
 * subscription, and notifying the whole company about a billing problem is both
 * noise and a disclosure.
 */

/** Day stamp so a recurring warning is at most once per day per organization. */
const dayStamp = (date: Date) => date.toISOString().slice(0, 10);

export const runSubscriptionWarnings = async (now: Date) => {
  const subscriptions = await prisma.subscription.findMany({
    where: { organization: { deletedAt: null } },
    include: {
      plan: { select: { name: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  const inputs: CreateNotificationInput[] = [];

  for (const subscription of subscriptions) {
    const state = resolveSubscriptionState(subscription, now);

    if (!state.isWarning || !state.reason) continue;

    let type: NotificationType | null = null;
    let title = "";
    let dedupeSuffix = "";

    if (state.effectiveStatus === "TRIALING") {
      // Nudge at fixed thresholds rather than every day of the trial — three
      // reminders in the final week is a prompt, thirty is spam.
      const days = state.daysRemaining;
      if (days === null || !TRIAL_WARNING_DAYS.includes(days as never)) continue;

      type = "SUBSCRIPTION_TRIAL_ENDING";
      title = days === 1 ? "Your trial ends tomorrow" : `Your trial ends in ${days} days`;
      dedupeSuffix = `d${days}`;
    } else if (state.effectiveStatus === "PAST_DUE") {
      type = "SUBSCRIPTION_PAST_DUE";
      title = "Payment overdue";
      dedupeSuffix = dayStamp(now);
    } else if (
      state.effectiveStatus === "EXPIRED" ||
      state.effectiveStatus === "CANCELLED"
    ) {
      if (!state.isReadOnly) continue; // cancelled but still within paid time

      type = "SUBSCRIPTION_EXPIRED";
      title = "Your subscription has ended";
      dedupeSuffix = dayStamp(now);
    }

    if (!type) continue;

    const admins = await prisma.user.findMany({
      where: {
        organizationId: subscription.organizationId,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const admin of admins) {
      inputs.push({
        userId: admin.id,
        organizationId: subscription.organizationId,
        type,
        title,
        // Reuse the resolver's wording so the notification, the banner and the
        // rejection message a user hits all say the same thing.
        body: state.reason,
        entityType: "SUBSCRIPTION",
        entityId: subscription.id,
        dedupeKey: `${type}:${subscription.organizationId}:${dedupeSuffix}`,
      });
    }
  }

  const created = await notificationService.createMany(inputs);
  return { created, skipped: inputs.length - created };
};
