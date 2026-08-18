import { Prisma, UserStatus } from "@prisma/client";
import { prisma, DB } from "../../config/db";
import { paginate } from "../../utils/db/paginate";
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from "../../contracts/constants";
import type { SubscriptionStatus } from "../../contracts/types";

/**
 * Billing Repository
 *
 * Plans, their feature rows, subscriptions, per-organization overrides, and the
 * counts that back enforcement and the usage screen.
 */

const planInclude = {
  features: true,
} satisfies Prisma.PlanInclude;

export type PlanWithFeatures = Prisma.PlanGetPayload<{
  include: typeof planInclude;
}>;

const subscriptionInclude = {
  plan: { include: planInclude },
  featureOverrides: true,
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

export interface PlanFindAllOptions {
  pageNum?: number;
  limitNum?: number;
  search?: string;
  includeInactive?: boolean;
  includePrivate?: boolean;
}

export interface SubscriptionFindAllOptions {
  pageNum?: number;
  limitNum?: number;
  search?: string;
  /** Filter on the STORED column. */
  status?: string | string[];
  /** Filter on the RESOLVED status. Takes precedence over `status`. */
  effectiveStatus?: SubscriptionStatus[];
  /** Clock used to resolve effectiveStatus. Injectable so it can be tested. */
  now?: Date;
  planId?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Effective status as a SQL predicate.
 *
 * This MUST agree with resolveSubscriptionState() in subscription.utils.ts,
 * which is the authority — every access decision goes through it. This is the
 * same rules expressed as a WHERE clause so the database can filter and
 * paginate, instead of the service loading every tenant's subscription and
 * doing it in memory.
 *
 * A materialized column was the obvious alternative and is the wrong trade:
 * effective status is derived from the clock, so a stored value is wrong the
 * moment a period ends and stays wrong until a job runs. This is exact at every
 * instant, needs no migration and no job.
 *
 * The pairing is guarded by src/scripts/verifyBillingStatusFilter.ts, which
 * cross-checks this predicate against the resolver for every subscription and
 * fails if they ever disagree.
 *
 * Derivation, for each stored status (G = grace days, cutoff = now - G):
 *   EXPIRED   -> always EXPIRED
 *   CANCELLED -> always CANCELLED (dates only affect read-only, not the label)
 *   TRIALING  -> TRIALING while trialEndsAt is null or future;
 *                then PAST_DUE while trialEndsAt > cutoff; then EXPIRED
 *   ACTIVE    -> ACTIVE while currentPeriodEnd is null or future;
 *                then PAST_DUE while currentPeriodEnd > cutoff; then EXPIRED
 *   PAST_DUE  -> anchor is currentPeriodEnd, falling back to trialEndsAt;
 *                PAST_DUE with no anchor or anchor > cutoff; else EXPIRED
 */
const effectiveStatusPredicates = (
  status: SubscriptionStatus,
  now: Date,
): Prisma.SubscriptionWhereInput[] => {
  const cutoff = new Date(
    now.getTime() - SUBSCRIPTION_GRACE_PERIOD_DAYS * MS_PER_DAY,
  );

  /** Stored PAST_DUE rows anchor on currentPeriodEnd, else trialEndsAt. */
  const pastDueAnchorWithin = (within: boolean): Prisma.SubscriptionWhereInput[] =>
    within
      ? [
          { status: "PAST_DUE", currentPeriodEnd: null, trialEndsAt: null },
          { status: "PAST_DUE", currentPeriodEnd: { gt: cutoff } },
          {
            status: "PAST_DUE",
            currentPeriodEnd: null,
            trialEndsAt: { gt: cutoff },
          },
        ]
      : [
          { status: "PAST_DUE", currentPeriodEnd: { lte: cutoff } },
          {
            status: "PAST_DUE",
            currentPeriodEnd: null,
            trialEndsAt: { lte: cutoff },
          },
        ];

  switch (status) {
    case "ACTIVE":
      return [
        { status: "ACTIVE", currentPeriodEnd: null },
        { status: "ACTIVE", currentPeriodEnd: { gt: now } },
      ];

    case "TRIALING":
      return [
        { status: "TRIALING", trialEndsAt: null },
        { status: "TRIALING", trialEndsAt: { gt: now } },
      ];

    case "CANCELLED":
      return [{ status: "CANCELLED" }];

    case "PAST_DUE":
      return [
        {
          status: "TRIALING",
          trialEndsAt: { lte: now, gt: cutoff },
        },
        {
          status: "ACTIVE",
          currentPeriodEnd: { lte: now, gt: cutoff },
        },
        ...pastDueAnchorWithin(true),
      ];

    case "EXPIRED":
      return [
        { status: "EXPIRED" },
        { status: "TRIALING", trialEndsAt: { lte: cutoff } },
        { status: "ACTIVE", currentPeriodEnd: { lte: cutoff } },
        ...pastDueAnchorWithin(false),
      ];

    default:
      return [];
  }
};

/** One feature value as written by the console. */
export interface FeatureValueInput {
  featureKey: string;
  valueInt?: number | null;
  valueBool?: boolean | null;
  note?: string | null;
}

export const billingRepository = {
  // ------------------------------- Plans ---------------------------------

  findAllPlans: async (options: PlanFindAllOptions = {}, tx?: DB) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 50, 100);

    const where: Prisma.PlanWhereInput = {};

    // Retired plans stay in the database because subscriptions still point at
    // them; they must not appear in a picker.
    if (!options.includeInactive) {
      where.isActive = true;
    }

    // Unlisted plans are perfectly assignable — an enterprise deal or a
    // grandfathered legacy plan — they are simply not on the menu.
    if (!options.includePrivate) {
      where.isPublic = true;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { code: { contains: options.search, mode: "insensitive" } },
        { slug: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const result = await paginate(db.plan, where, { page, limit }, db, {
      orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }],
      include: planInclude,
    });

    return {
      ...result,
      data: result.data as PlanWithFeatures[],
    };
  },

  findPlanById: async (id: string, tx?: DB) => {
    const db = tx || prisma;
    return db.plan.findUnique({ where: { id }, include: planInclude });
  },

  findPlanByCode: async (code: string, tx?: DB) => {
    const db = tx || prisma;
    return db.plan.findUnique({ where: { code }, include: planInclude });
  },

  findPlanBySlug: async (slug: string, tx?: DB) => {
    const db = tx || prisma;
    return db.plan.findUnique({ where: { slug }, include: planInclude });
  },

  /**
   * Create a plan and its feature rows together.
   *
   * One transaction: a plan whose features failed to write would silently fall
   * back to code defaults for every key, which is not what the operator
   * configured.
   */
  createPlan: async (
    data: Prisma.PlanUncheckedCreateInput,
    features: FeatureValueInput[],
    tx?: DB,
  ) => {
    const db = tx || prisma;

    const run = async (client: DB) => {
      const plan = await client.plan.create({ data });

      if (features.length) {
        await client.planFeature.createMany({
          data: features.map((feature) => ({
            planId: plan.id,
            featureKey: feature.featureKey,
            valueInt: feature.valueInt ?? null,
            valueBool: feature.valueBool ?? null,
          })),
        });
      }

      return client.plan.findUniqueOrThrow({
        where: { id: plan.id },
        include: planInclude,
      });
    };

    return tx ? run(tx) : prisma.$transaction(run);
  },

  updatePlan: async (
    id: string,
    data: Prisma.PlanUncheckedUpdateInput,
    features: FeatureValueInput[] | undefined,
    tx?: DB,
  ) => {
    const run = async (client: DB) => {
      await client.plan.update({ where: { id }, data });

      // Upsert rather than delete-and-recreate: recreating would churn ids that
      // nothing references today but would also briefly leave a plan with no
      // features if the insert failed mid-transaction.
      if (features) {
        for (const feature of features) {
          await client.planFeature.upsert({
            where: {
              planId_featureKey: { planId: id, featureKey: feature.featureKey },
            },
            create: {
              planId: id,
              featureKey: feature.featureKey,
              valueInt: feature.valueInt ?? null,
              valueBool: feature.valueBool ?? null,
            },
            update: {
              valueInt: feature.valueInt ?? null,
              valueBool: feature.valueBool ?? null,
            },
          });
        }
      }

      return client.plan.findUniqueOrThrow({
        where: { id },
        include: planInclude,
      });
    };

    return tx ? run(tx) : prisma.$transaction(run);
  },

  /** Guard for retiring a plan people are still on. */
  countSubscriptionsOnPlan: async (planId: string, tx?: DB) => {
    const db = tx || prisma;
    return db.subscription.count({ where: { planId } });
  },

  // ---------------------------- Subscriptions -----------------------------

  /**
   * The hot path: called by the write-blocking middleware on every mutating
   * request, so it stays a single indexed lookup on a unique column.
   */
  findSubscriptionByOrganizationId: async (
    organizationId: string,
    tx?: DB,
  ): Promise<SubscriptionWithRelations | null> => {
    const db = tx || prisma;
    return db.subscription.findUnique({
      where: { organizationId },
      include: subscriptionInclude,
    });
  },

  findAllSubscriptions: async (
    options: SubscriptionFindAllOptions = {},
    tx?: DB,
  ) => {
    const db = tx || prisma;
    const page = options.pageNum || 1;
    const limit = Math.min(options.limitNum || 20, 100);

    const where: Prisma.SubscriptionWhereInput = {};

    if (options.search) {
      where.organization = {
        OR: [
          { name: { contains: options.search, mode: "insensitive" } },
          { slug: { contains: options.search, mode: "insensitive" } },
        ],
      };
    }

    if (options.effectiveStatus?.length) {
      // Effective status, resolved in SQL — see buildEffectiveStatusWhere.
      where.OR = options.effectiveStatus.flatMap((status) =>
        effectiveStatusPredicates(status, options.now ?? new Date()),
      );
    } else if (options.status) {
      where.status = Array.isArray(options.status)
        ? { in: options.status as Prisma.EnumSubscriptionStatusFilter["in"] }
        : (options.status as never);
    }

    if (options.planId) {
      where.planId = options.planId;
    }

    const result = await paginate(db.subscription, where, { page, limit }, db, {
      orderBy: { createdAt: "desc" },
      include: subscriptionInclude,
    });

    return {
      ...result,
      data: result.data as SubscriptionWithRelations[],
    };
  },

  /**
   * Open a subscription for an organization.
   *
   * Transaction-aware so it can join the organization-creation transaction — a
   * new org and its subscription must commit together or not at all. The
   * organizationId is @unique, so a second create for the same org throws P2002;
   * callers that repair an existing org must check first (see assignInitialPlan).
   */
  createSubscription: async (
    data: Prisma.SubscriptionUncheckedCreateInput,
    tx?: DB,
  ): Promise<SubscriptionWithRelations> => {
    const db = tx || prisma;
    return db.subscription.create({
      data,
      include: subscriptionInclude,
    });
  },

  /**
   * Live organizations that have no subscription row — the stranded set the
   * repair path exists for. Small (usually empty once creation assigns one), so
   * returned whole rather than paginated.
   */
  findOrganizationsWithoutSubscription: async (tx?: DB) => {
    const db = tx || prisma;
    return db.organization.findMany({
      // Only ACTIVE orgs are actionable here: archived orgs are excluded by
      // deletedAt, and a suspended org is not a live tenant that silently slipped
      // through billing — surfacing it just adds noise to the repair list.
      where: { deletedAt: null, subscription: null, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  },

  updateSubscription: async (
    organizationId: string,
    data: Prisma.SubscriptionUncheckedUpdateInput,
    tx?: DB,
  ): Promise<SubscriptionWithRelations> => {
    const db = tx || prisma;
    return db.subscription.update({
      where: { organizationId },
      data,
      include: subscriptionInclude,
    });
  },

  /**
   * Replace an organization's overrides wholesale.
   *
   * Delete-then-insert inside one transaction: the payload is the COMPLETE set,
   * so a key the operator removed must actually disappear. A per-key upsert
   * would leave stale overrides behind with no way to revert a customer to plan
   * terms.
   */
  replaceFeatureOverrides: async (
    subscriptionId: string,
    overrides: FeatureValueInput[],
    tx?: DB,
  ) => {
    const run = async (client: DB) => {
      await client.subscriptionFeatureOverride.deleteMany({
        where: { subscriptionId },
      });

      if (overrides.length) {
        await client.subscriptionFeatureOverride.createMany({
          data: overrides.map((override) => ({
            subscriptionId,
            featureKey: override.featureKey,
            valueInt: override.valueInt ?? null,
            valueBool: override.valueBool ?? null,
            note: override.note ?? null,
          })),
        });
      }
    };

    return tx ? run(tx) : prisma.$transaction(run);
  },

  // -------------------------------- Usage ---------------------------------

  /**
   * Seats in use.
   *
   * A seat is an ACTIVE, non-deleted user. Disabled users deliberately do not
   * consume one — that is the documented way to free a seat without losing the
   * person's history.
   */
  countActiveSeats: async (organizationId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.user.count({
      where: { organizationId, deletedAt: null, status: UserStatus.ACTIVE },
    });
  },

  countLeads: async (organizationId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.lead.count({ where: { organizationId, deletedAt: null } });
  },

  countProspects: async (organizationId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.prospect.count({ where: { organizationId } });
  },

  countQuotations: async (organizationId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.quotation.count({ where: { organizationId, deletedAt: null } });
  },

  countItems: async (organizationId: string, tx?: DB): Promise<number> => {
    const db = tx || prisma;
    return db.item.count({ where: { organizationId, deletedAt: null } });
  },
};
