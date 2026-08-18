import { Prisma, Role } from "@prisma/client";
import {
  billingRepository,
  type FeatureValueInput,
  type PlanWithFeatures,
  type SubscriptionWithRelations,
} from "./billing.repository";
import { organizationRepository } from "../organization/organization.repository";
import { AppError } from "../../utils/errors/appError";
import { logger } from "../../config/logger";
import { ROLES } from "../../constants/roles";
import {
  buildInitialSubscription,
  resolveSubscriptionState,
} from "../../utils/business/subscription.utils";
import {
  isAtLimit,
  resolveLimit,
  resolveToggle,
  type FeatureSource,
} from "../../utils/business/feature.utils";
import {
  FEATURE_DEFINITIONS,
  FEATURE_KEYS,
  LIMIT_FEATURE_KEYS,
  type FeatureKey,
} from "../../contracts/constants";
import type {
  BillingUsage,
  PlanFeatureValue,
  PlanSummary,
  ResolvedFeatureValue,
  SubscriptionStatus,
  SubscriptionSummary,
  UsageMetric,
} from "../../contracts/types";
import type {
  CancelSubscriptionInput,
  CreatePlanInput,
  PlanFilterInput,
  SubscriptionFilterInput,
  UpdateFeatureOverridesInput,
  UpdatePlanInput,
  UpdateSubscriptionInput,
} from "../../contracts/validation";

type Actor = {
  id: string;
  role: Role;
  organizationId?: string | null;
};

/**
 * Present EVERY known feature key, not only the rows a plan happens to have.
 *
 * A console that shows only configured keys hides the ones an operator most
 * needs to set. Missing rows fall back to the code-side default, which is
 * exactly what resolveLimit/resolveToggle already do.
 */
const buildPlanFeatures = (plan: PlanWithFeatures): PlanFeatureValue[] =>
  FEATURE_KEYS.map((key) => {
    const definition = FEATURE_DEFINITIONS[key];
    const source: FeatureSource = { planFeatures: plan.features };

    if (definition.kind === "limit") {
      const resolved = resolveLimit(source, key);
      return {
        key,
        kind: definition.kind,
        label: definition.label,
        description: definition.description,
        enforced: definition.enforced,
        valueInt: resolved.value,
        valueBool: null,
      };
    }

    const resolved = resolveToggle(source, key);
    return {
      key,
      kind: definition.kind,
      label: definition.label,
      description: definition.description,
      enforced: definition.enforced,
      valueInt: null,
      valueBool: resolved.value,
    };
  });

const mapPlan = (plan: PlanWithFeatures): PlanSummary => ({
  id: plan.id,
  code: plan.code,
  slug: plan.slug,
  name: plan.name,
  description: plan.description,
  priceMinor: plan.priceMinor,
  currency: plan.currency,
  billingCycle: plan.billingCycle,
  trialDays: plan.trialDays,
  isActive: plan.isActive,
  isPublic: plan.isPublic,
  sortOrder: plan.sortOrder,
  features: buildPlanFeatures(plan),
});

/** Features as they apply to one organization, with the origin of each value. */
const buildResolvedFeatures = (
  subscription: SubscriptionWithRelations,
): ResolvedFeatureValue[] => {
  const source: FeatureSource = {
    planFeatures: subscription.plan.features,
    overrides: subscription.featureOverrides,
  };

  return FEATURE_KEYS.map((key) => {
    const definition = FEATURE_DEFINITIONS[key];
    const override = subscription.featureOverrides.find(
      (row) => row.featureKey === key,
    );

    if (definition.kind === "limit") {
      const resolved = resolveLimit(source, key);
      return {
        key,
        kind: definition.kind,
        label: definition.label,
        description: definition.description,
        enforced: definition.enforced,
        valueInt: resolved.value,
        valueBool: null,
        origin: resolved.origin,
        overrideNote: resolved.origin === "override" ? override?.note : null,
      };
    }

    const resolved = resolveToggle(source, key);
    return {
      key,
      kind: definition.kind,
      label: definition.label,
      description: definition.description,
      enforced: definition.enforced,
      valueInt: null,
      valueBool: resolved.value,
      origin: resolved.origin,
      overrideNote: resolved.origin === "override" ? override?.note : null,
    };
  });
};

const mapSubscription = (
  row: SubscriptionWithRelations,
): SubscriptionSummary => {
  const state = resolveSubscriptionState(row);

  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organization?.name ?? null,
    plan: mapPlan(row.plan),

    status: row.status,
    effectiveStatus: state.effectiveStatus,
    isReadOnly: state.isReadOnly,
    isWarning: state.isWarning,
    daysRemaining: state.daysRemaining,
    reason: state.reason,

    features: buildResolvedFeatures(row),

    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,

    billingEmail: row.billingEmail,
    billingNotes: row.billingNotes,

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

/** Derive a slug from a plan code when the operator did not supply one. */
const deriveSlug = (code: string) => code.toLowerCase().replace(/_/g, "-");

const toFeatureInputs = (
  features: CreatePlanInput["features"] | undefined,
): FeatureValueInput[] | undefined =>
  features?.map((feature) => ({
    featureKey: feature.featureKey,
    valueInt: feature.valueInt ?? null,
    valueBool: feature.valueBool ?? null,
  }));

const loadSubscriptionOrThrow = async (organizationId: string) => {
  const subscription =
    await billingRepository.findSubscriptionByOrganizationId(organizationId);

  if (!subscription) {
    // Every live organization is guaranteed one by backfillSubscriptions.ts, so
    // this is a data problem worth surfacing loudly rather than papering over.
    logger.error("Organization has no subscription", {
      code: "SUBSCRIPTION_MISSING",
      organizationId,
    });
    throw AppError.resource.notFound("Subscription");
  }

  return subscription;
};

/**
 * Resolve which organization a tenant-facing request is about.
 *
 * A super-admin has no organization of their own; they reach a tenant's billing
 * either by scoping in (x-organization-id) or through the platform console.
 */
const resolveTenantOrganizationId = (
  actor: Actor,
  scopedOrganizationId?: string,
): string => {
  const organizationId = scopedOrganizationId ?? actor.organizationId;

  if (!organizationId) {
    throw AppError.validation.badRequest(
      "No organization in context. Super admins should use the billing console or scope into an organization.",
    );
  }

  return organizationId;
};

export const billingService = {
  // -------------------------------- Plans ---------------------------------

  async getPlans(
    params: PlanFilterInput,
    actor: Actor,
  ): Promise<{ data: PlanSummary[]; meta: any }> {
    const isSuperAdmin = actor.role === ROLES.SUPER_ADMIN;

    const result = await billingRepository.findAllPlans({
      pageNum: params.page,
      limitNum: params.limit,
      search: params.search,
      // Only the platform operator sees retired or unlisted plans.
      includeInactive: isSuperAdmin && params.includeInactive,
      includePrivate: isSuperAdmin && params.includePrivate,
    });

    return {
      data: result.data.map(mapPlan),
      meta: result.meta,
    };
  },

  async getPlanById(id: string): Promise<PlanSummary> {
    const plan = await billingRepository.findPlanById(id);
    if (!plan) {
      throw AppError.resource.notFound("Plan", id);
    }
    return mapPlan(plan);
  },

  async createPlan(input: CreatePlanInput): Promise<PlanSummary> {
    const existing = await billingRepository.findPlanByCode(input.code);
    if (existing) {
      throw AppError.resource.alreadyExists("Plan", "code");
    }

    const slug = input.slug ?? deriveSlug(input.code);
    const slugTaken = await billingRepository.findPlanBySlug(slug);
    if (slugTaken) {
      throw AppError.resource.alreadyExists("Plan", "slug");
    }

    const plan = await billingRepository.createPlan(
      {
        code: input.code,
        slug,
        name: input.name,
        description: input.description ?? null,
        priceMinor: input.priceMinor,
        billingCycle: input.billingCycle,
        trialDays: input.trialDays,
        isActive: input.isActive,
        isPublic: input.isPublic,
        sortOrder: input.sortOrder,
      },
      toFeatureInputs(input.features) ?? [],
    );

    return mapPlan(plan);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<PlanSummary> {
    const existing = await billingRepository.findPlanById(id);
    if (!existing) {
      throw AppError.resource.notFound("Plan", id);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await billingRepository.findPlanBySlug(input.slug);
      if (slugTaken) {
        throw AppError.resource.alreadyExists("Plan", "slug");
      }
    }

    /*
     * Retiring a plan people are still on is allowed and does NOT evict them:
     * isActive only removes it from the picker. Logged because it is the sort of
     * change whose blast radius is easy to misjudge.
     */
    if (input.isActive === false && existing.isActive) {
      const affected = await billingRepository.countSubscriptionsOnPlan(id);
      if (affected > 0) {
        logger.warn("Plan retired while organizations are still on it", {
          planId: id,
          planCode: existing.code,
          affectedOrganizations: affected,
        });
      }
    }

    /*
     * Lowering a limit does NOT retroactively evict anyone: enforcement only
     * refuses NEW usage, so an organization already over the new number keeps
     * what it has and simply cannot add more. Silently disabling somebody's
     * staff because a price list changed would be indefensible.
     */
    const loweredLimits = (input.features ?? []).filter((feature) => {
      const definition = FEATURE_DEFINITIONS[feature.featureKey as FeatureKey];
      if (definition?.kind !== "limit") return false;

      const current = existing.features.find(
        (row) => row.featureKey === feature.featureKey,
      );
      return (
        current?.valueInt != null &&
        feature.valueInt != null &&
        feature.valueInt < current.valueInt
      );
    });

    if (loweredLimits.length) {
      const affected = await billingRepository.countSubscriptionsOnPlan(id);
      if (affected > 0) {
        logger.warn("Plan limits lowered while organizations are on it", {
          planId: id,
          planCode: existing.code,
          keys: loweredLimits.map((feature) => feature.featureKey),
          affectedOrganizations: affected,
        });
      }
    }

    const plan = await billingRepository.updatePlan(
      id,
      {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.priceMinor !== undefined
          ? { priceMinor: input.priceMinor }
          : {}),
        ...(input.billingCycle !== undefined
          ? { billingCycle: input.billingCycle }
          : {}),
        ...(input.trialDays !== undefined ? { trialDays: input.trialDays } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      toFeatureInputs(input.features),
    );

    return mapPlan(plan);
  },

  // ---------------------------- Subscriptions -----------------------------

  async getMySubscription(
    actor: Actor,
    scopedOrganizationId?: string,
  ): Promise<SubscriptionSummary> {
    const organizationId = resolveTenantOrganizationId(
      actor,
      scopedOrganizationId,
    );
    return mapSubscription(await loadSubscriptionOrThrow(organizationId));
  },

  /**
   * Lean subscription status for gating UI, readable by EVERY tenant role.
   *
   * Unlike getMySubscription (billing-read only, full plan + pricing), this
   * exposes only the derived state a manager/executive needs to understand why a
   * write was blocked, plus the resolved TOGGLE features so client feature gates
   * (e.g. quotation PDF) are authoritative for lower roles instead of defaulting
   * to enabled. Fails open when no subscription exists, matching
   * resolveSubscriptionState — this is a read that must never itself 404.
   */
  async getMySubscriptionStatus(
    actor: Actor,
    scopedOrganizationId?: string,
  ): Promise<{
    effectiveStatus: SubscriptionStatus;
    isReadOnly: boolean;
    isWarning: boolean;
    daysRemaining: number | null;
    reason: string | null;
    features: Record<string, boolean>;
  }> {
    const organizationId = resolveTenantOrganizationId(
      actor,
      scopedOrganizationId,
    );
    const subscription =
      await billingRepository.findSubscriptionByOrganizationId(organizationId);
    const state = resolveSubscriptionState(subscription);

    const features: Record<string, boolean> = {};
    if (subscription) {
      const source: FeatureSource = {
        planFeatures: subscription.plan.features,
        overrides: subscription.featureOverrides,
      };
      for (const key of FEATURE_KEYS) {
        if (FEATURE_DEFINITIONS[key].kind === "toggle") {
          features[key] = resolveToggle(source, key).value;
        }
      }
    }

    return {
      effectiveStatus: state.effectiveStatus,
      isReadOnly: state.isReadOnly,
      isWarning: state.isWarning,
      daysRemaining: state.daysRemaining,
      reason: state.reason,
      features,
    };
  },

  async getSubscriptions(
    params: SubscriptionFilterInput,
  ): Promise<{ data: SubscriptionSummary[]; meta: any }> {
    /*
     * The status filter means EFFECTIVE status — a lapsed ACTIVE row is really
     * EXPIRED — and that is now resolved by the database.
     *
     * This used to fetch every subscription with its relations on each filtered
     * page and resolve in memory, which is O(all tenants) per page view. The
     * predicate in billingRepository encodes the same rules as
     * resolveSubscriptionState, so the DB filters, counts and paginates.
     */
    const effectiveStatus = params.status
      ? ((Array.isArray(params.status)
          ? params.status
          : [params.status]) as SubscriptionStatus[])
      : undefined;

    const result = await billingRepository.findAllSubscriptions({
      pageNum: params.page,
      limitNum: params.limit,
      search: params.search,
      planId: params.planId,
      effectiveStatus,
    });

    return { data: result.data.map(mapSubscription), meta: result.meta };
  },

  /**
   * Live organizations with no subscription — the stranded set the repair path
   * (assignInitialPlan) exists for. Surfaced in the console so a super-admin can
   * find and fix them instead of them being invisible.
   */
  async getOrganizationsWithoutSubscription(): Promise<
    { id: string; name: string; slug: string; createdAt: string }[]
  > {
    const orgs = await billingRepository.findOrganizationsWithoutSubscription();
    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
    }));
  },

  async getSubscriptionByOrganization(
    organizationId: string,
  ): Promise<SubscriptionSummary> {
    return mapSubscription(await loadSubscriptionOrThrow(organizationId));
  },

  /**
   * Open the FIRST subscription for an organization that has none.
   *
   * The repair path for organizations created before subscriptions were wired
   * into org creation. `updateSubscription` cannot do this — it loads the row
   * first and 404s — so a stranded org needs its own create path. Not idempotent
   * on purpose: a second call 409s rather than silently overwriting live terms.
   * Ongoing plan changes go through `updateSubscription`.
   */
  async assignInitialPlan(
    organizationId: string,
    planId: string,
  ): Promise<SubscriptionSummary> {
    const organization = await organizationRepository.findById(organizationId, undefined, {
      includeArchived: true,
    });
    if (!organization) {
      throw AppError.resource.notFound("Organization");
    }
    if (organization.deletedAt) {
      throw AppError.business.ruleViolation(
        "An archived organization cannot be assigned a subscription",
      );
    }

    const existing =
      await billingRepository.findSubscriptionByOrganizationId(organizationId);
    if (existing) {
      throw AppError.resource.conflict(
        "Organization already has a subscription. Use update to change its plan.",
      );
    }

    const plan = await billingRepository.findPlanById(planId);
    if (!plan) {
      throw AppError.validation.badRequest("Selected plan does not exist");
    }
    if (!plan.isActive) {
      throw AppError.business.ruleViolation(
        `Plan "${plan.name}" is retired and cannot be assigned`,
      );
    }

    const initial = buildInitialSubscription(plan);
    const created = await billingRepository.createSubscription({
      organizationId,
      planId: plan.id,
      status: initial.status,
      trialEndsAt: initial.trialEndsAt,
      currentPeriodStart: initial.currentPeriodStart,
      currentPeriodEnd: initial.currentPeriodEnd,
    });

    return mapSubscription(created);
  },

  async updateSubscription(
    organizationId: string,
    input: UpdateSubscriptionInput,
  ): Promise<{ subscription: SubscriptionSummary; planChanged: boolean }> {
    const existing = await loadSubscriptionOrThrow(organizationId);

    let planChanged = false;

    if (input.planId && input.planId !== existing.planId) {
      const plan = await billingRepository.findPlanById(input.planId);
      if (!plan) {
        throw AppError.validation.badRequest("Selected plan does not exist");
      }
      if (!plan.isActive) {
        throw AppError.business.ruleViolation(
          `Plan "${plan.name}" is retired and cannot be assigned`,
        );
      }
      planChanged = true;
    }

    const updated = await billingRepository.updateSubscription(organizationId, {
      ...(input.planId !== undefined ? { planId: input.planId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.trialEndsAt !== undefined
        ? { trialEndsAt: input.trialEndsAt }
        : {}),
      ...(input.currentPeriodStart !== undefined
        ? { currentPeriodStart: input.currentPeriodStart }
        : {}),
      ...(input.currentPeriodEnd !== undefined
        ? { currentPeriodEnd: input.currentPeriodEnd }
        : {}),
      ...(input.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
        : {}),
      ...(input.billingEmail !== undefined
        ? { billingEmail: input.billingEmail }
        : {}),
      ...(input.billingNotes !== undefined
        ? { billingNotes: input.billingNotes }
        : {}),
    });

    return { subscription: mapSubscription(updated), planChanged };
  },

  /**
   * Replace an organization's feature overrides.
   *
   * The payload is the complete set; omitted keys revert to plan terms.
   */
  async updateFeatureOverrides(
    organizationId: string,
    input: UpdateFeatureOverridesInput,
  ): Promise<SubscriptionSummary> {
    const existing = await loadSubscriptionOrThrow(organizationId);

    await billingRepository.replaceFeatureOverrides(
      existing.id,
      input.overrides.map((override) => ({
        featureKey: override.featureKey,
        valueInt: override.valueInt ?? null,
        valueBool: override.valueBool ?? null,
        note: override.note ?? null,
      })),
    );

    return mapSubscription(await loadSubscriptionOrThrow(organizationId));
  },

  async cancelSubscription(
    organizationId: string,
    input: CancelSubscriptionInput,
  ): Promise<SubscriptionSummary> {
    const existing = await loadSubscriptionOrThrow(organizationId);

    if (existing.status === "CANCELLED") {
      throw AppError.business.stateConflict("Subscription is already cancelled");
    }

    const now = new Date();

    const data: Prisma.SubscriptionUncheckedUpdateInput = {
      cancelledAt: now,
      billingNotes: input.reason
        ? `${existing.billingNotes ? `${existing.billingNotes}\n` : ""}Cancelled: ${input.reason}`
        : existing.billingNotes,
    };

    if (
      input.atPeriodEnd &&
      existing.currentPeriodEnd &&
      existing.currentPeriodEnd > now
    ) {
      // Stay ACTIVE and let the clock do the work — resolveSubscriptionState
      // reports the warning and flips to read-only once the date passes.
      data.cancelAtPeriodEnd = true;
    } else {
      data.status = "CANCELLED" as SubscriptionStatus;
      data.cancelAtPeriodEnd = false;
      data.currentPeriodEnd = now;
    }

    const updated = await billingRepository.updateSubscription(
      organizationId,
      data,
    );

    return mapSubscription(updated);
  },

  // -------------------------------- Usage ---------------------------------

  /**
   * Usage against the limits that apply to this organization.
   *
   * Every limit key is reported; `enforced` says which ones the application
   * actually refuses on, so the screen never implies a decorative limit is a
   * real one.
   */
  async getUsage(
    actor: Actor,
    scopedOrganizationId?: string,
  ): Promise<BillingUsage> {
    const organizationId = resolveTenantOrganizationId(
      actor,
      scopedOrganizationId,
    );
    const subscription = await loadSubscriptionOrThrow(organizationId);

    const [seats, leads, prospects, quotations, items] = await Promise.all([
      billingRepository.countActiveSeats(organizationId),
      billingRepository.countLeads(organizationId),
      billingRepository.countProspects(organizationId),
      billingRepository.countQuotations(organizationId),
      billingRepository.countItems(organizationId),
    ]);

    const usedByKey: Record<string, number> = {
      MAX_USERS: seats,
      MAX_LEADS: leads,
      MAX_PROSPECTS: prospects,
      MAX_QUOTATIONS: quotations,
      MAX_ITEMS: items,
    };

    const source: FeatureSource = {
      planFeatures: subscription.plan.features,
      overrides: subscription.featureOverrides,
    };

    const metrics: UsageMetric[] = LIMIT_FEATURE_KEYS.map((key) => {
      const definition = FEATURE_DEFINITIONS[key];
      const resolved = resolveLimit(source, key);
      const used = usedByKey[key] ?? 0;

      return {
        key,
        label: definition.label,
        used,
        limit: resolved.value,
        // Guard the divide: a limit of 0 would otherwise produce Infinity.
        percentUsed:
          resolved.value === null || resolved.value <= 0
            ? null
            : Math.round((used / resolved.value) * 100),
        atLimit: isAtLimit(resolved.value, used),
        enforced: definition.enforced,
        origin: resolved.origin,
      };
    });

    return { organizationId, metrics };
  },
};
