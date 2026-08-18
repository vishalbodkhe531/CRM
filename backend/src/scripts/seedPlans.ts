import { prisma } from "../config/db";
import { logger } from "../config/logger";
import {
  FEATURE_DEFINITIONS,
  PLAN_SEEDS,
  type FeatureKey,
} from "../contracts/constants";

/**
 * Default system plans — created once at installation.
 *
 * Idempotent and safe to run on every deploy, but deliberately NON-DESTRUCTIVE:
 * a plan that already exists is left completely alone. Once a super-admin has
 * edited pricing or limits through the console, a redeploy resetting them to the
 * values checked into git would be a billing incident.
 *
 * `--force-update` re-applies the seed values, including feature rows. Use it
 * intentionally, never as part of an automated deploy.
 *
 * `--prune` deletes plans that are NOT in the seed — the ones hand-created in
 * the console. A plan with subscribers is never deleted; it is reported so the
 * operator can retire it instead. Together the two flags make this file the
 * authoritative definition of the catalogue.
 *
 * Run:  npx tsx src/scripts/seedPlans.ts [--force-update] [--prune]
 */

const FORCE_UPDATE = process.argv.includes("--force-update");
const PRUNE = process.argv.includes("--prune");

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

const formatPrice = (priceMinor: number) =>
  `INR ${(priceMinor / 100).toLocaleString("en-IN")}`;

/** Split a seed's feature map into the typed column the key's kind requires. */
const toFeatureRows = (
  planId: string,
  features: Partial<Record<FeatureKey, number | boolean | null>>,
) =>
  Object.entries(features).map(([key, value]) => {
    const definition = FEATURE_DEFINITIONS[key as FeatureKey];

    if (!definition) {
      throw new Error(
        `Plan seed references unknown feature key "${key}". Add it to FEATURE_KEYS first.`,
      );
    }

    return {
      planId,
      featureKey: key,
      // A limit stores null as "unlimited"; a toggle stores a boolean.
      valueInt: definition.kind === "limit" ? (value as number | null) : null,
      valueBool: definition.kind === "toggle" ? (value as boolean) : null,
    };
  });

async function seedPlans() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of PLAN_SEEDS) {
    const existing = await prisma.plan.findUnique({
      where: { code: seed.code },
    });

    const planData = {
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      priceMinor: seed.priceMinor,
      billingCycle: seed.billingCycle,
      trialDays: seed.trialDays,
      sortOrder: seed.sortOrder,
      isActive: seed.isActive ?? true,
      isPublic: seed.isPublic ?? true,
    };

    if (!existing) {
      await prisma.$transaction(async (tx) => {
        const plan = await tx.plan.create({
          data: { code: seed.code, ...planData },
        });
        await tx.planFeature.createMany({
          data: toFeatureRows(plan.id, seed.features),
        });
      });

      created += 1;
      logger.info("Plan created", {
        code: seed.code,
        price: formatPrice(seed.priceMinor),
        public: planData.isPublic,
      });
      continue;
    }

    if (!FORCE_UPDATE) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { code: seed.code }, data: planData });

      for (const row of toFeatureRows(existing.id, seed.features)) {
        await tx.planFeature.upsert({
          where: {
            planId_featureKey: {
              planId: existing.id,
              featureKey: row.featureKey,
            },
          },
          create: row,
          update: { valueInt: row.valueInt, valueBool: row.valueBool },
        });
      }
    });

    updated += 1;
    logger.warn("Plan overwritten from seed (--force-update)", {
      code: seed.code,
      price: formatPrice(seed.priceMinor),
    });
  }

  let pruned = 0;

  if (PRUNE) {
    const seededCodes = PLAN_SEEDS.map((seed) => seed.code);

    const strays = await prisma.plan.findMany({
      where: { code: { notIn: seededCodes } },
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { code: "asc" },
    });

    for (const stray of strays) {
      /*
       * A plan with subscribers is never deleted. Postgres would refuse anyway
       * (Subscription.planId has no onDelete), but failing loudly here explains
       * WHY, and points at the action that is actually correct: retire it, which
       * leaves existing subscribers on their agreed terms.
       */
      if (stray._count.subscriptions > 0) {
        logger.warn("Plan kept — it has subscribers; retire it instead", {
          code: stray.code,
          subscriptions: stray._count.subscriptions,
        });
        console.log(
          `\n! ${stray.code} has ${stray._count.subscriptions} subscription(s) and was NOT deleted.\n` +
            `  Set it to not-assignable in the plans console to withdraw it without\n` +
            `  changing what those customers already have.\n`,
        );
        continue;
      }

      // PlanFeature cascades from Plan; PlatformSetting.defaultPlanId is SetNull.
      await prisma.plan.delete({ where: { id: stray.id } });
      pruned += 1;
      logger.warn("Plan pruned — not present in the seed", {
        code: stray.code,
      });
    }
  }

  logger.info("Plan seed complete", { created, updated, skipped, pruned });

  if (skipped > 0 && !FORCE_UPDATE) {
    console.log(
      `\n${skipped} existing plan(s) left untouched. Re-run with --force-update to overwrite them with the checked-in seed values.\n`,
    );
  }

  if (created > 0) {
    console.log(
      "\n⚠️  Seeded plans use PLACEHOLDER pricing and limits. Set the real terms\n" +
        "   in the super-admin plans console before onboarding a paying customer.\n",
    );
  }
}

seedPlans()
  .catch((error) => {
    logger.error("Plan seed failed", { error: getErrorMessage(error) });
    console.error(`\nSeed failed: ${getErrorMessage(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
