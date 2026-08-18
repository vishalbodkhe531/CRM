import type { PlanInterval, SubscriptionStatus } from "../../contracts/types";
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from "../../contracts/constants";

/**
 * Subscription state resolution.
 *
 * There is no scheduler in this application, so nothing flips a subscription's
 * stored `status` when a trial or a billing period runs out. The column records
 * what an operator last SET; this module works out what is actually TRUE right
 * now by comparing the stored dates against the clock.
 *
 * Every access decision — the write-blocking middleware, the seat check, the
 * banners — must go through resolveSubscriptionState(). Reading
 * `subscription.status` directly is always a bug: it will happily report ACTIVE
 * for a subscription that lapsed three months ago.
 *
 * Pure by design: no database, no imports from Prisma, `now` passed in. That is
 * what makes it testable, and this is where billing bugs will live.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The subset of a Subscription this module needs. Keeps it Prisma-independent. */
export interface SubscriptionLike {
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: Date | null;
}

export interface SubscriptionState {
  /** What is true right now, as opposed to the stored column. */
  effectiveStatus: SubscriptionStatus;
  /** Writes must be refused. Reads are always allowed. */
  isReadOnly: boolean;
  /** There is something the user should be told about. Drives the banner. */
  isWarning: boolean;
  /**
   * Whole days until the next boundary that matters — end of trial, end of
   * period, or end of the grace window. Null when nothing is pending.
   * Rounded UP: with 4 hours left, "1 day" is honest and "0 days" is alarming.
   */
  daysRemaining: number | null;
  /** Human-readable explanation of effectiveStatus, safe to show a customer. */
  reason: string | null;
}

const daysBetween = (from: Date, to: Date) =>
  Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * The moment this subscription stopped being paid for.
 *
 * A lapsed trial is anchored on trialEndsAt; everything else on
 * currentPeriodEnd. Each falls back to the other because a subscription that
 * has one date but not the other is still perfectly meaningful.
 */
const resolveLapseAnchor = (
  subscription: SubscriptionLike,
): Date | null => {
  if (subscription.status === "TRIALING") {
    return subscription.trialEndsAt ?? subscription.currentPeriodEnd ?? null;
  }
  return subscription.currentPeriodEnd ?? subscription.trialEndsAt ?? null;
};

/**
 * Shared handling for "the paid-for period is over".
 *
 * Inside the grace window the account keeps working with a warning; past it the
 * account goes read-only. Never a hard lockout — see the module note in
 * subscription.middleware.ts.
 */
const resolveLapsed = (
  anchor: Date,
  now: Date,
  wasTrial: boolean,
): SubscriptionState => {
  const graceEnds = new Date(anchor.getTime() + SUBSCRIPTION_GRACE_PERIOD_DAYS * MS_PER_DAY);

  if (now < graceEnds) {
    const daysLeft = daysBetween(now, graceEnds);
    return {
      effectiveStatus: "PAST_DUE",
      isReadOnly: false,
      isWarning: true,
      daysRemaining: daysLeft,
      reason: wasTrial
        ? `Your trial ended on ${formatDate(anchor)}. You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to subscribe.`
        : `Payment is overdue since ${formatDate(anchor)}. You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left before the account becomes read-only.`,
    };
  }

  return {
    effectiveStatus: "EXPIRED",
    isReadOnly: true,
    isWarning: true,
    daysRemaining: null,
    reason: wasTrial
      ? `Your trial ended on ${formatDate(anchor)}. Subscribe to start making changes again.`
      : `Your subscription expired on ${formatDate(anchor)}. Renew to start making changes again.`,
  };
};

export const resolveSubscriptionState = (
  subscription: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): SubscriptionState => {
  /*
   * Fail OPEN when there is no subscription.
   *
   * backfillSubscriptions.ts guarantees every live organization has one, so
   * this should be unreachable. If it is ever reached it means a bug in a
   * brand-new billing module — and locking every tenant out of a product they
   * have paid for is a far worse outcome than briefly not charging one.
   * The caller logs this; see billingService.
   */
  if (!subscription) {
    return {
      effectiveStatus: "ACTIVE",
      isReadOnly: false,
      isWarning: false,
      daysRemaining: null,
      reason: null,
    };
  }

  const { status } = subscription;

  // --- Terminal: an operator explicitly expired it -------------------------
  if (status === "EXPIRED") {
    return {
      effectiveStatus: "EXPIRED",
      isReadOnly: true,
      isWarning: true,
      daysRemaining: null,
      reason: "Your subscription has expired. Renew to start making changes again.",
    };
  }

  // --- Cancelled: paid-for time is still honoured --------------------------
  if (status === "CANCELLED") {
    const end = subscription.currentPeriodEnd;

    if (end && end > now) {
      const daysLeft = daysBetween(now, end);
      return {
        effectiveStatus: "CANCELLED",
        // Deliberately NOT read-only: they paid through this date. Confiscating
        // the remainder on the day they cancel is how you earn a chargeback.
        isReadOnly: false,
        isWarning: true,
        daysRemaining: daysLeft,
        reason: `Your subscription is cancelled and access ends on ${formatDate(end)}.`,
      };
    }

    return {
      effectiveStatus: "CANCELLED",
      isReadOnly: true,
      isWarning: true,
      daysRemaining: null,
      reason: end
        ? `Your subscription was cancelled and access ended on ${formatDate(end)}.`
        : "Your subscription has been cancelled.",
    };
  }

  // --- Trialing ------------------------------------------------------------
  if (status === "TRIALING") {
    const trialEnd = subscription.trialEndsAt;

    // A trial with no end date cannot expire. Odd, but not a reason to lock out.
    if (!trialEnd) {
      return {
        effectiveStatus: "TRIALING",
        isReadOnly: false,
        isWarning: true,
        daysRemaining: null,
        reason: "You are on a trial.",
      };
    }

    if (trialEnd > now) {
      const daysLeft = daysBetween(now, trialEnd);
      return {
        effectiveStatus: "TRIALING",
        isReadOnly: false,
        isWarning: true,
        daysRemaining: daysLeft,
        reason: `Your trial ends on ${formatDate(trialEnd)} — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`,
      };
    }

    return resolveLapsed(trialEnd, now, true);
  }

  // --- Active --------------------------------------------------------------
  if (status === "ACTIVE") {
    const end = subscription.currentPeriodEnd;

    // No end date = no expiry. This is what grandfathered accounts rely on.
    if (!end) {
      return {
        effectiveStatus: "ACTIVE",
        isReadOnly: false,
        isWarning: false,
        daysRemaining: null,
        reason: null,
      };
    }

    if (end > now) {
      const daysLeft = daysBetween(now, end);

      if (subscription.cancelAtPeriodEnd) {
        return {
          effectiveStatus: "ACTIVE",
          isReadOnly: false,
          isWarning: true,
          daysRemaining: daysLeft,
          reason: `Your subscription will not renew and access ends on ${formatDate(end)}.`,
        };
      }

      return {
        effectiveStatus: "ACTIVE",
        isReadOnly: false,
        isWarning: false,
        daysRemaining: daysLeft,
        reason: null,
      };
    }

    return resolveLapsed(end, now, false);
  }

  // --- Past due: an operator already flagged it ----------------------------
  const anchor = resolveLapseAnchor(subscription);

  // Flagged past due with no date to measure from — warn, but do not guess a
  // lockout date out of thin air.
  if (!anchor) {
    return {
      effectiveStatus: "PAST_DUE",
      isReadOnly: false,
      isWarning: true,
      daysRemaining: null,
      reason: "Payment is overdue on your account.",
    };
  }

  return resolveLapsed(anchor, now, false);
};

/*
 * Seat limits used to be resolved here from two hard-coded columns. They now
 * live as feature rows — see resolveLimit() in feature.utils.ts, which handles
 * every limit key with the same override -> plan -> default precedence.
 */

/** The subset of a Plan needed to open a subscription. Keeps this Prisma-independent. */
export interface PlanInitLike {
  trialDays: number;
  billingCycle: PlanInterval;
  /** PAISE. Zero means there is nothing to bill, and so nothing to expire. */
  priceMinor: number;
}

/** Fields to write when a subscription is first opened on a plan. */
export interface InitialSubscriptionData {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  /** Null for a plan with no price — see buildInitialSubscription. */
  currentPeriodEnd: Date | null;
}

const MONTHS_PER_INTERVAL: Record<PlanInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

const addMonths = (from: Date, months: number) => {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
};

/**
 * Compute the opening state of a subscription from the plan the super-admin chose.
 *
 * Pure and shared so organization creation and the "assign a plan" repair path
 * open a subscription identically — the alternative, two call sites each doing
 * their own date arithmetic, is how a trial ends up with no trialEndsAt on one
 * path and not the other.
 *
 *  - priceMinor == 0 -> ACTIVE with NO period end. Nothing is billed, so there
 *    is no renewal date and nothing to lapse. This covers the free tier and the
 *    negotiated plans, whose real dates an operator sets by hand afterwards.
 *  - trialDays > 0  -> TRIALING; trialEndsAt and the first period both end when
 *    the trial does. resolveSubscriptionState anchors a lapsed trial on
 *    trialEndsAt, so the two must agree.
 *  - trialDays == 0 -> ACTIVE; the first period runs one billing cycle. There is
 *    no payment gateway yet, so renewal is a manual updateSubscription — but the
 *    period is real, which is what makes enforcement mean anything.
 *
 * The zero-price branch exists because the alternative is silent lockout. A
 * free plan opened with a one-month period went read-only on day 38 telling the
 * customer "your subscription expired, renew to continue" — with nothing to
 * renew. Enterprise, being YEARLY, did the same at day 372: the negotiated
 * customers would have broken a year in, one at a time, long after anyone
 * connected it to this function.
 */
export const buildInitialSubscription = (
  plan: PlanInitLike,
  now: Date = new Date(),
): InitialSubscriptionData => {
  if (plan.priceMinor === 0) {
    return {
      status: "ACTIVE",
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: null,
    };
  }

  if (plan.trialDays > 0) {
    const trialEnd = new Date(now.getTime() + plan.trialDays * MS_PER_DAY);
    return {
      status: "TRIALING",
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    };
  }

  return {
    status: "ACTIVE",
    trialEndsAt: null,
    currentPeriodStart: now,
    currentPeriodEnd: addMonths(now, MONTHS_PER_INTERVAL[plan.billingCycle]),
  };
};
