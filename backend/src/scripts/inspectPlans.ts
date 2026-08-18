import { prisma } from "../config/db";
import { resolveSubscriptionState } from "../utils/business/subscription.utils";

/**
 * Read-only report on the plan catalogue and who is on what.
 *
 * Written to answer "which plans can we safely retire" — a plan with live
 * subscribers cannot simply be deleted, so this shows the subscriber count and
 * the resolved feature values side by side to expose duplicates.
 *
 * Run:  npx tsx src/scripts/inspectPlans.ts
 */
async function main() {
  const plans = await prisma.plan.findMany({
    include: {
      features: true,
      _count: { select: { subscriptions: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const limitOf = (plan: (typeof plans)[number], key: string) => {
    const row = plan.features.find((f) => f.featureKey === key);
    if (!row) return "—";
    return row.valueInt === null ? "∞" : String(row.valueInt);
  };

  const toggleOf = (plan: (typeof plans)[number], key: string) => {
    const row = plan.features.find((f) => f.featureKey === key);
    return row?.valueBool ? "y" : "n";
  };

  console.log("\n=== PLAN CATALOGUE ===\n");
  console.log(
    [
      "CODE".padEnd(15),
      "PRICE".padStart(8),
      "CYCLE".padEnd(10),
      "TRIAL".padStart(5),
      "USERS".padStart(6),
      "LEADS".padStart(7),
      "PROSP".padStart(6),
      "QUOTE".padStart(6),
      "ITEMS".padStart(6),
      "AUDIT".padStart(5),
      "ANNC".padStart(4),
      "PDF".padStart(3),
      "ACTIVE".padStart(6),
      "PUBLIC".padStart(6),
      "SUBS".padStart(4),
    ].join(" "),
  );

  for (const plan of plans) {
    console.log(
      [
        plan.code.padEnd(15),
        (plan.priceMinor / 100).toFixed(0).padStart(8),
        plan.billingCycle.padEnd(10),
        String(plan.trialDays).padStart(5),
        limitOf(plan, "MAX_USERS").padStart(6),
        limitOf(plan, "MAX_LEADS").padStart(7),
        limitOf(plan, "MAX_PROSPECTS").padStart(6),
        limitOf(plan, "MAX_QUOTATIONS").padStart(6),
        limitOf(plan, "MAX_ITEMS").padStart(6),
        toggleOf(plan, "AUDIT_LOG_ACCESS").padStart(5),
        toggleOf(plan, "ANNOUNCEMENTS").padStart(4),
        toggleOf(plan, "QUOTATION_PDF").padStart(3),
        String(plan.isActive).padStart(6),
        String(plan.isPublic).padStart(6),
        String(plan._count.subscriptions).padStart(4),
      ].join(" "),
    );
  }

  console.log("\n=== SUBSCRIPTIONS BY PLAN ===\n");
  const subs = await prisma.subscription.findMany({
    include: {
      plan: { select: { code: true } },
      organization: { select: { name: true, slug: true, deletedAt: true } },
    },
  });

  if (!subs.length) {
    console.log("(none)");
  }

  /*
   * Effective status, not the stored column: a subscription still marked ACTIVE
   * whose period ended is really EXPIRED and its tenant is read-only. Printing
   * the resolved value is the only way this report answers "is anyone locked
   * out, or about to be".
   */
  const now = new Date();
  for (const sub of subs) {
    const state = resolveSubscriptionState(sub, now);
    const daysLeft = sub.currentPeriodEnd
      ? Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000)
      : null;

    console.log(
      `${sub.plan.code.padEnd(15)} stored=${sub.status.padEnd(9)} ` +
        `effective=${state.effectiveStatus.padEnd(9)} ` +
        `${state.isReadOnly ? "READ-ONLY " : "writable  "}` +
        `expires=${
          sub.currentPeriodEnd
            ? `${sub.currentPeriodEnd.toISOString().slice(0, 10)} (${daysLeft}d)`
            : "never"
        } ` +
        `${sub.organization.deletedAt ? "[archived] " : ""}${sub.organization.name}`,
    );
  }

  console.log("\n=== ORGANIZATIONS ===\n");
  const orgs = await prisma.organization.findMany({
    select: {
      name: true,
      slug: true,
      status: true,
      deletedAt: true,
      _count: { select: { users: true, leads: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const org of orgs) {
    console.log(
      `${org.slug.padEnd(28)} ${org.status.padEnd(10)} ${
        org.deletedAt ? "archived" : "live    "
      } users=${org._count.users} leads=${org._count.leads}`,
    );
  }

  console.log("\n=== TOTALS ===\n");
  const [users, leads, prospects, quotations, items, auditLogs, notifications] =
    await Promise.all([
      prisma.user.count(),
      prisma.lead.count(),
      prisma.prospect.count(),
      prisma.quotation.count(),
      prisma.item.count(),
      prisma.auditLog.count(),
      prisma.notification.count(),
    ]);
  console.log({
    organizations: orgs.length,
    plans: plans.length,
    subscriptions: subs.length,
    users,
    leads,
    prospects,
    quotations,
    items,
    auditLogs,
    notifications,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
