import { LeadStatus, OrganizationStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { ROLES } from "../../constants";
import type {
  AdminStatsDTO,
  ExecutiveStatsDTO,
  ManagerStatsDTO,
  SuperAdminStatsDTO,
} from "../../contracts/dashboard";

const roundPercentage = (part: number, total: number) =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

const fullName = (user: { firstName: string; lastName: string }) =>
  `${user.firstName} ${user.lastName}`.trim();

const leadDisplayName = (lead: {
  firstName: string;
  lastName: string;
  companyName?: string | null;
}) => lead.companyName ?? `${lead.firstName} ${lead.lastName}`.trim();

const labelFromKey = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not Set";

const readFollowUpMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { followUpDate: null, completed: false };
  }

  const value = metadata as {
    followUpDate?: unknown;
    completedHealth?: unknown;
  };

  return {
    followUpDate:
      typeof value.followUpDate === "string" ? value.followUpDate : null,
    completed: value.completedHealth === "DONE",
  };
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const metadataDateKey = (value: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
};

/** Organizations shown individually in the lead-distribution chart. */
const DISTRIBUTION_LIMIT = 6;

type TrendBucketRow = {
  monthBucket: Date;
  weekBucket: Date;
  count: number;
};

/**
 * Lead counts per month and per week, grouped in SQL.
 *
 * `column` is interpolated with Prisma.raw and is NOT user input — it is one of
 * two literals chosen by the caller. Every value that comes from outside stays a
 * bound parameter.
 *
 * Scoped to live leads in live tenants, matching liveLeadScope: a lead belonging
 * to an archived organization must not appear in a platform trend the
 * Organizations list says nothing about.
 */
const countLeadTrend = async (
  db: typeof prisma,
  column: "createdAt" | "convertedAt",
  since: Date,
): Promise<TrendBucketRow[]> => {
  const dateColumn = Prisma.raw(`l."${column}"`);

  return db.$queryRaw<TrendBucketRow[]>`
    SELECT
      date_trunc('month', ${dateColumn}) AS "monthBucket",
      date_trunc('week',  ${dateColumn}) AS "weekBucket",
      COUNT(*)::int                      AS "count"
    FROM "Lead" l
    JOIN "Organization" o ON o."id" = l."organizationId"
    WHERE l."deletedAt" IS NULL
      AND o."deletedAt" IS NULL
      AND ${dateColumn} >= ${since}
    GROUP BY 1, 2
  `;
};

export const dashboardRepository = {
  /* ═══════════════════════════════════════════════════════════════
     SUPER ADMIN DASHBOARD
  ═══════════════════════════════════════════════════════════════ */
  async getSuperAdminStats(): Promise<SuperAdminStatsDTO> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const getWeekStart = (date: Date) => {
      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      const daysSinceMonday = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      return weekStart;
    };

    const monthWindowStart = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth() - 5,
      1,
    );
    monthWindowStart.setHours(0, 0, 0, 0);

    const weekWindowStart = getWeekStart(startOfToday);
    weekWindowStart.setDate(weekWindowStart.getDate() - 5 * 7);

    const trendWindowStart =
      monthWindowStart < weekWindowStart ? monthWindowStart : weekWindowStart;

    /**
     * Platform KPI contract: every number on this dashboard counts LIVE data in
     * LIVE tenants.
     *
     * "Live tenant" means not archived (deletedAt null) — the same rule the
     * Organizations list applies by default, so the two screens agree by
     * construction. Archiving also forces status to SUSPENDED, so without this
     * an archived org was invisible in the Organizations list yet still counted
     * in the total AND in the Suspended slice of the status donut.
     *
     * Archived organizations are reported separately as their own count rather
     * than being silently folded into "suspended".
     */
    const liveOrganizationScope: Prisma.OrganizationWhereInput = {
      deletedAt: null,
    };
    const inLiveOrganization = { organization: liveOrganizationScope };

    const liveLeadScope: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...inLiveOrganization,
    };
    const liveProspectScope: Prisma.ProspectWhereInput = {
      deletedAt: null,
      lead: { deletedAt: null, ...inLiveOrganization },
    };
    const liveQuotationScope: Prisma.QuotationWhereInput = {
      deletedAt: null,
      ...inLiveOrganization,
    };

    const [
      totalUsers,
      totalItems,
      totalLeads,
      totalOrganizations,
      totalProspects,
      totalQuotations,
      approvedRevenueAggregate,
      organizationStatusGroups,
      archivedOrganizations,
      recentOrganizationsRaw,
      leadGroups,
      userGroups,
      leadsForTrend,
      convertedLeadsForTrend,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: { not: ROLES.SUPER_ADMIN },
          deletedAt: null,
          ...inLiveOrganization,
        },
      }),
      prisma.item.count({ where: inLiveOrganization }),
      prisma.lead.count({ where: liveLeadScope }),
      prisma.organization.count({ where: liveOrganizationScope }),
      prisma.prospect.count({ where: liveProspectScope }),
      prisma.quotation.count({ where: liveQuotationScope }),
      prisma.quotation.aggregate({
        where: { ...liveQuotationScope, status: "APPROVED" },
        _sum: { grandTotal: true },
      }),
      prisma.organization.groupBy({
        by: ["status"],
        where: liveOrganizationScope,
        _count: { id: true },
      }),
      prisma.organization.count({ where: { deletedAt: { not: null } } }),
      prisma.organization.findMany({
        where: liveOrganizationScope,
        select: {
          id: true,
          name: true,
          slug: true,
          prefix: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.lead.groupBy({
        by: ["organizationId"],
        where: liveLeadScope,
        _count: { id: true },
      }),
      prisma.user.groupBy({
        by: ["organizationId"],
        where: {
          organizationId: { not: null },
          role: { not: ROLES.SUPER_ADMIN },
          deletedAt: null,
          ...inLiveOrganization,
        },
        _count: { id: true },
      }),
      /*
       * Trend counts are bucketed by the DATABASE.
       *
       * This used to select one row per lead in the window and tally them in
       * JS — correct, but it ships every lead of the last six months across the
       * wire to produce twelve numbers. date_trunc gives both the monthly and
       * the weekly grouping in a single pass.
       *
       * Postgres truncates in UTC and its week starts Monday, which matches
       * getWeekStart below. On a UTC server — which is what this deploys to —
       * that is identical to the previous local-time bucketing.
       */
      countLeadTrend(prisma, "createdAt", trendWindowStart),
      countLeadTrend(prisma, "convertedAt", trendWindowStart),
    ]);

    const leadCountByOrganizationId = new Map(
      leadGroups.map((group) => [group.organizationId, group._count.id]),
    );
    const userCountByOrganizationId = new Map(
      userGroups
        .filter((group) => group.organizationId)
        .map((group) => [group.organizationId!, group._count.id]),
    );
    /*
     * Lead distribution, bounded.
     *
     * Built from the already-aggregated per-organization counts rather than by
     * loading every organization: only the handful actually charted need names,
     * and the rest are reported as one "other" total. The previous version
     * fetched all N organizations to display six of them.
     *
     * Organizations with no leads are absent by construction — leadGroups only
     * contains organizations that have some — which is the right population for
     * a chart about where leads are.
     */
    const rankedGroups = [...leadGroups].sort(
      (a, b) => b._count.id - a._count.id,
    );
    const topGroups = rankedGroups.slice(0, DISTRIBUTION_LIMIT);
    const remainderGroups = rankedGroups.slice(DISTRIBUTION_LIMIT);

    const topOrganizations = topGroups.length
      ? await prisma.organization.findMany({
          where: { id: { in: topGroups.map((group) => group.organizationId) } },
          select: { id: true, name: true },
        })
      : [];

    const organizationNameById = new Map(
      topOrganizations.map((organization) => [organization.id, organization.name]),
    );

    const organizationLeadDistribution = topGroups
      .map((group) => {
        const leadCount = group._count.id;

        return {
          organizationId: group.organizationId,
          // A group whose organization vanished between the two queries is
          // still real activity; label it rather than dropping the count.
          organizationName:
            organizationNameById.get(group.organizationId) ??
            "Unknown Organization",
          leadCount,
          percentage: roundPercentage(leadCount, totalLeads),
        };
      })
      .sort((a, b) => {
        if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount;
        return a.organizationName.localeCompare(b.organizationName);
      });

    const otherLeadCount = remainderGroups.reduce(
      (sum, group) => sum + group._count.id,
      0,
    );

    const otherOrganizations = remainderGroups.length
      ? {
          organizationCount: remainderGroups.length,
          leadCount: otherLeadCount,
          percentage: roundPercentage(otherLeadCount, totalLeads),
        }
      : null;

    const createTrendBucket = (period: string) => ({
      period,
      totalLeads: 0,
      conversions: 0,
    });

    const monthlyBuckets = new Map<string, ReturnType<typeof createTrendBucket>>();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(
        monthWindowStart.getFullYear(),
        monthWindowStart.getMonth() + index,
        1,
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyBuckets.set(
        key,
        createTrendBucket(date.toLocaleString("en-US", { month: "short" })),
      );
    }

    const weeklyBuckets = new Map<string, ReturnType<typeof createTrendBucket>>();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(weekWindowStart);
      date.setDate(weekWindowStart.getDate() + index * 7);
      weeklyBuckets.set(
        toDateKey(date),
        createTrendBucket(
          date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
        ),
      );
    }

    /**
     * Add pre-aggregated SQL buckets into the prepared display buckets.
     *
     * The display buckets exist so a period with no activity still renders as a
     * zero rather than vanishing from the chart; SQL only returns periods that
     * have rows. Buckets outside the display window are ignored.
     */
    const applyTrendRows = (
      rows: TrendBucketRow[],
      metric: "totalLeads" | "conversions",
    ) => {
      for (const row of rows) {
        const monthKey = `${row.monthBucket.getFullYear()}-${String(
          row.monthBucket.getMonth() + 1,
        ).padStart(2, "0")}`;
        const monthlyBucket = monthlyBuckets.get(monthKey);
        if (monthlyBucket) monthlyBucket[metric] += row.count;

        const weeklyBucket = weeklyBuckets.get(toDateKey(row.weekBucket));
        if (weeklyBucket) weeklyBucket[metric] += row.count;
      }
    };

    applyTrendRows(leadsForTrend, "totalLeads");
    applyTrendRows(convertedLeadsForTrend, "conversions");

    const organizationStatus = organizationStatusGroups.reduce<{
      active: number;
      suspended: number;
    }>(
      (acc, group) => {
        if (group.status === OrganizationStatus.ACTIVE) {
          acc.active = group._count.id;
        } else {
          acc.suspended = group._count.id;
        }

        return acc;
      },
      { active: 0, suspended: 0 },
    );

    const recentOrganizations = recentOrganizationsRaw.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      prefix: organization.prefix,
      users: userCountByOrganizationId.get(organization.id) ?? 0,
      leads: leadCountByOrganizationId.get(organization.id) ?? 0,
      status: organization.status,
      createdDate: organization.createdAt.toISOString(),
      exportReportUrl: null,
    }));

    leadGroups.forEach((group) => {
      if (!organizationNameById.has(group.organizationId)) {
        organizationNameById.set(group.organizationId, "Unknown Organization");
      }
    });

    return {
      totalUsers,
      totalItems,
      totalLeads,
      totalOrganizations,
      totalProspects,
      totalQuotations,
      approvedQuotationRevenue: Number(
        (approvedRevenueAggregate._sum.grandTotal ?? 0).toFixed(2),
      ),
      organizationLeadDistribution,
      otherOrganizations,
      leadTrend: {
        monthly: Array.from(monthlyBuckets.values()),
        weekly: Array.from(weeklyBuckets.values()),
      },
      recentOrganizations,
      organizationStatus: {
        active: organizationStatus.active,
        suspended: organizationStatus.suspended,
        archived: archivedOrganizations,
        // Live tenants only, matching totalOrganizations and the default
        // Organizations list. Archived is reported alongside, not inside.
        total: totalOrganizations,
      },
    };
  },

  /* ═══════════════════════════════════════════════════════════════
     ADMIN DASHBOARD — single consolidated query
     Organization-scoped KPIs, trends, and team performance.
     No service imports. Data shaping and DB queries stay in this repository.
  ═══════════════════════════════════════════════════════════════ */
  async getAdminDashboardData(organizationId: string): Promise<AdminStatsDTO> {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const openLeadStatuses: LeadStatus[] = [
      LeadStatus.NEW,
      LeadStatus.ATTEMPTED_CONTACT,
      LeadStatus.CONTACTED,
    ];
    const statusOrder: LeadStatus[] = [
      LeadStatus.NEW,
      LeadStatus.ATTEMPTED_CONTACT,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.UNQUALIFIED,
    ];

    const getWeekStart = (date: Date) => {
      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      const daysSinceMonday = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      return weekStart;
    };

    const monthWindowStart = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth() - 5,
      1,
    );
    monthWindowStart.setHours(0, 0, 0, 0);
    const weekWindowStart = getWeekStart(startOfToday);
    weekWindowStart.setDate(weekWindowStart.getDate() - 5 * 7);
    const trendWindowStart =
      monthWindowStart < weekWindowStart ? monthWindowStart : weekWindowStart;

    const leadScope: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
    };
    const prospectScope: Prisma.ProspectWhereInput = {
      organizationId,
      deletedAt: null,
      lead: { deletedAt: null },
    };
    const quotationScope: Prisma.QuotationWhereInput = {
      organizationId,
      deletedAt: null,
    };
    const activeFollowUpScope: Prisma.ProspectWhereInput = {
      organizationId,
      deletedAt: null,
      lead: { deletedAt: null },
      stage: { notIn: ["WON", "LOST"] },
    };

    const [
      totalLeads,
      newLeadsToday,
      openLeads,
      prospects,
      quotationsSent,
      customersWon,
      lostLeads,
      quotationValueAggregate,
      salesValueAggregate,
      followUpsDueToday,
      overdueFollowUps,
      leadSourceGroups,
      leadStatusGroups,
      convertedLeads,
      activeUsers,
      leadsForPerformance,
      prospectsForPerformance,
      quotationsForPerformance,
      leadsForTrend,
      wonProspectsForTrend,
      quotationsForTrend,
    ] = await Promise.all([
      prisma.lead.count({ where: leadScope }),
      prisma.lead.count({
        where: { ...leadScope, createdAt: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.lead.count({
        where: { ...leadScope, status: { in: openLeadStatuses } },
      }),
      prisma.prospect.count({ where: prospectScope }),
      prisma.quotation.count({ where: quotationScope }),
      prisma.prospect.count({ where: { ...prospectScope, stage: "WON" } }),
      prisma.lead.count({ where: { ...leadScope, status: "UNQUALIFIED" } }),
      prisma.quotation.aggregate({
        where: quotationScope,
        _sum: { grandTotal: true },
      }),
      prisma.quotation.aggregate({
        where: { ...quotationScope, status: "APPROVED" },
        _sum: { grandTotal: true },
      }),
      prisma.prospect.count({
        where: {
          ...activeFollowUpScope,
          followUpDate: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.prospect.count({
        where: {
          ...activeFollowUpScope,
          followUpDate: { not: null },
          OR: [
            { followUpDate: { lt: startOfToday } },
            {
              AND: [
                { followUpDate: { gte: startOfToday, lt: endOfToday } },
                { followUpTime: { not: null, lt: currentTime } },
              ],
            },
          ],
        },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: leadScope,
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { ...leadScope, convertedAt: null },
        _count: { id: true },
      }),
      prisma.lead.count({
        where: { ...leadScope, convertedAt: { not: null } },
      }),
      prisma.user.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          role: { in: [Role.MANAGER, Role.EXECUTIVE] },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          managerId: true,
          manager: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ role: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.lead.findMany({
        where: { ...leadScope, assignedToId: { not: null } },
        select: {
          assignedToId: true,
          status: true,
        },
      }),
      prisma.prospect.findMany({
        where: { ...prospectScope, assignedToId: { not: null } },
        select: {
          assignedToId: true,
          stage: true,
        },
      }),
      prisma.quotation.findMany({
        where: quotationScope,
        select: {
          assignedToId: true,
          createdById: true,
          status: true,
          grandTotal: true,
        },
      }),
      prisma.lead.findMany({
        where: { ...leadScope, createdAt: { gte: trendWindowStart } },
        select: {
          createdAt: true,
          status: true,
        },
      }),
      prisma.prospect.findMany({
        where: {
          ...prospectScope,
          stage: "WON",
          updatedAt: { gte: trendWindowStart },
        },
        select: { updatedAt: true },
      }),
      prisma.quotation.findMany({
        where: { ...quotationScope, date: { gte: trendWindowStart } },
        select: { date: true, status: true, grandTotal: true },
      }),
    ]);

    const leadSourceWiseItems = leadSourceGroups
      .map((group) => ({
        key: group.source ?? "NOT_SET",
        label: labelFromKey(group.source),
        count: group._count.id,
        percentage: roundPercentage(group._count.id, totalLeads),
      }))
      .sort((a, b) => b.count - a.count);

    const statusCounts = leadStatusGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      },
      {},
    );
    const leadStatusFunnelItems = [
      ...statusOrder.map((status) => ({
        key: status,
        label: status === LeadStatus.UNQUALIFIED ? "Lost" : labelFromKey(status),
        count: statusCounts[status] ?? 0,
      })),
      { key: "CONVERTED", label: "Converted", count: convertedLeads },
    ].map((item) => ({
      ...item,
      percentage: roundPercentage(item.count, totalLeads),
    }));

    const createLeadTrendBucket = (period: string) => ({
      period,
      totalLeads: 0,
      newLeads: 0,
      openLeads: 0,
      customersWon: 0,
      lostLeads: 0,
    });
    const createSalesTrendBucket = (period: string) => ({
      period,
      quotationValue: 0,
      salesValue: 0,
    });

    const leadMonthBuckets = new Map<
      string,
      ReturnType<typeof createLeadTrendBucket>
    >();
    const salesMonthBuckets = new Map<
      string,
      ReturnType<typeof createSalesTrendBucket>
    >();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(
        monthWindowStart.getFullYear(),
        monthWindowStart.getMonth() + index,
        1,
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      leadMonthBuckets.set(key, createLeadTrendBucket(label));
      salesMonthBuckets.set(key, createSalesTrendBucket(label));
    }

    const leadWeekBuckets = new Map<
      string,
      ReturnType<typeof createLeadTrendBucket>
    >();
    const salesWeekBuckets = new Map<
      string,
      ReturnType<typeof createSalesTrendBucket>
    >();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(weekWindowStart);
      date.setDate(weekWindowStart.getDate() + index * 7);
      const key = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      leadWeekBuckets.set(key, createLeadTrendBucket(label));
      salesWeekBuckets.set(key, createSalesTrendBucket(label));
    }

    const addLeadTrend = (
      date: Date,
      metric: keyof Omit<ReturnType<typeof createLeadTrendBucket>, "period">,
    ) => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthBucket = leadMonthBuckets.get(monthKey);
      if (monthBucket) monthBucket[metric] += 1;

      const weekKey = getWeekStart(date).toISOString().split("T")[0];
      const weekBucket = leadWeekBuckets.get(weekKey);
      if (weekBucket) weekBucket[metric] += 1;
    };

    const addSalesTrend = (
      date: Date,
      metric: keyof Omit<ReturnType<typeof createSalesTrendBucket>, "period">,
      amount: number,
    ) => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthBucket = salesMonthBuckets.get(monthKey);
      if (monthBucket) monthBucket[metric] += amount;

      const weekKey = getWeekStart(date).toISOString().split("T")[0];
      const weekBucket = salesWeekBuckets.get(weekKey);
      if (weekBucket) weekBucket[metric] += amount;
    };

    leadsForTrend.forEach((lead) => {
      addLeadTrend(lead.createdAt, "totalLeads");
      if (lead.status === LeadStatus.NEW) addLeadTrend(lead.createdAt, "newLeads");
      if (openLeadStatuses.includes(lead.status)) {
        addLeadTrend(lead.createdAt, "openLeads");
      }
      if (lead.status === LeadStatus.UNQUALIFIED) {
        addLeadTrend(lead.createdAt, "lostLeads");
      }
    });
    wonProspectsForTrend.forEach((prospect) => {
      addLeadTrend(prospect.updatedAt, "customersWon");
    });
    quotationsForTrend.forEach((quotation) => {
      const value = Number(quotation.grandTotal);
      addSalesTrend(quotation.date, "quotationValue", value);
      if (quotation.status === "APPROVED") {
        addSalesTrend(quotation.date, "salesValue", value);
      }
    });

    const managers = activeUsers.filter((user) => user.role === Role.MANAGER);
    const executives = activeUsers.filter((user) => user.role === Role.EXECUTIVE);
    const activeUserIds = new Set(activeUsers.map((user) => user.id));
    const executiveById = new Map(executives.map((user) => [user.id, user]));
    const managerPerformanceMap = new Map(
      managers.map((manager) => [
        manager.id,
        {
          id: manager.id,
          managerName: fullName(manager),
          assignedLeads: 0,
          openLeads: 0,
          prospects: 0,
          quotationsSent: 0,
          customersWon: 0,
          quotationValue: 0,
          salesValue: 0,
        },
      ]),
    );
    const executivePerformanceMap = new Map(
      executives.map((executive) => [
        executive.id,
        {
          id: executive.id,
          executiveName: fullName(executive),
          managerName: executive.manager ? fullName(executive.manager) : null,
          assignedLeads: 0,
          openLeads: 0,
          prospects: 0,
          quotationsSent: 0,
          customersWon: 0,
          quotationValue: 0,
          salesValue: 0,
        },
      ]),
    );

    const resolveManagerId = (userId: string | null) => {
      if (!userId || !activeUserIds.has(userId)) return null;
      if (managerPerformanceMap.has(userId)) return userId;
      return executiveById.get(userId)?.managerId ?? null;
    };

    leadsForPerformance.forEach((lead) => {
      const assigneeId = lead.assignedToId;
      if (!assigneeId) return;

      const executivePerformance = executivePerformanceMap.get(assigneeId);
      if (executivePerformance) {
        executivePerformance.assignedLeads += 1;
        if (openLeadStatuses.includes(lead.status)) {
          executivePerformance.openLeads += 1;
        }
      }

      const managerId = resolveManagerId(assigneeId);
      const managerPerformance = managerId
        ? managerPerformanceMap.get(managerId)
        : null;
      if (managerPerformance) {
        managerPerformance.assignedLeads += 1;
        if (openLeadStatuses.includes(lead.status)) {
          managerPerformance.openLeads += 1;
        }
      }
    });

    prospectsForPerformance.forEach((prospect) => {
      const assigneeId = prospect.assignedToId;
      if (!assigneeId) return;

      const executivePerformance = executivePerformanceMap.get(assigneeId);
      if (executivePerformance) {
        executivePerformance.prospects += 1;
        if (prospect.stage === "WON") executivePerformance.customersWon += 1;
      }

      const managerId = resolveManagerId(assigneeId);
      const managerPerformance = managerId
        ? managerPerformanceMap.get(managerId)
        : null;
      if (managerPerformance) {
        managerPerformance.prospects += 1;
        if (prospect.stage === "WON") managerPerformance.customersWon += 1;
      }
    });

    quotationsForPerformance.forEach((quotation) => {
      const ownerId = quotation.assignedToId ?? quotation.createdById;
      const value = Number(quotation.grandTotal);

      const executivePerformance = executivePerformanceMap.get(ownerId);
      if (executivePerformance) {
        executivePerformance.quotationsSent += 1;
        executivePerformance.quotationValue += value;
        if (quotation.status === "APPROVED") executivePerformance.salesValue += value;
      }

      const managerId = resolveManagerId(ownerId);
      const managerPerformance = managerId
        ? managerPerformanceMap.get(managerId)
        : null;
      if (managerPerformance) {
        managerPerformance.quotationsSent += 1;
        managerPerformance.quotationValue += value;
        if (quotation.status === "APPROVED") managerPerformance.salesValue += value;
      }
    });

    const managerPerformance = Array.from(managerPerformanceMap.values())
      .map((manager) => ({
        ...manager,
        quotationValue: Number(manager.quotationValue.toFixed(2)),
        salesValue: Number(manager.salesValue.toFixed(2)),
        conversionPercentage: roundPercentage(
          manager.customersWon,
          manager.assignedLeads,
        ),
      }))
      .sort((a, b) => b.assignedLeads - a.assignedLeads);

    const executivePerformance = Array.from(executivePerformanceMap.values())
      .map((executive) => ({
        ...executive,
        quotationValue: Number(executive.quotationValue.toFixed(2)),
        salesValue: Number(executive.salesValue.toFixed(2)),
        conversionPercentage: roundPercentage(
          executive.customersWon,
          executive.assignedLeads,
        ),
      }))
      .sort((a, b) => b.assignedLeads - a.assignedLeads);

    const roundSalesTrend = (bucket: ReturnType<typeof createSalesTrendBucket>) => ({
      period: bucket.period,
      quotationValue: Number(bucket.quotationValue.toFixed(2)),
      salesValue: Number(bucket.salesValue.toFixed(2)),
    });

    return {
      kpis: {
        totalLeads,
        newLeadsToday,
        openLeads,
        prospects,
        quotationsSent,
        customersWon,
        lostLeads,
        conversionRate: roundPercentage(prospects, totalLeads),
        quotationValue: Number(quotationValueAggregate._sum.grandTotal ?? 0),
        salesValueWon: Number(salesValueAggregate._sum.grandTotal ?? 0),
        followUpsDueToday,
        overdueFollowUps,
      },
      leadSourceWise: {
        total: totalLeads,
        items: leadSourceWiseItems,
      },
      leadStatusFunnel: {
        total: totalLeads,
        items: leadStatusFunnelItems,
      },
      leadTrend: {
        monthly: Array.from(leadMonthBuckets.values()),
        weekly: Array.from(leadWeekBuckets.values()),
      },
      salesTrend: {
        monthly: Array.from(salesMonthBuckets.values()).map(roundSalesTrend),
        weekly: Array.from(salesWeekBuckets.values()).map(roundSalesTrend),
      },
      managerPerformance,
      executivePerformance,
    };
  },
  /* ═══════════════════════════════════════════════════════════════
     MANAGER DASHBOARD
  ═══════════════════════════════════════════════════════════════ */
  async getManagerStats(
    managerId: string,
    organizationId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<ManagerStatsDTO> {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    const todayKey = toDateKey(startOfDay);
    const openLeadStatuses: LeadStatus[] = [
      LeadStatus.NEW,
      LeadStatus.ATTEMPTED_CONTACT,
      LeadStatus.CONTACTED,
    ];
    const statusOrder = [
      LeadStatus.NEW,
      LeadStatus.ATTEMPTED_CONTACT,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.UNQUALIFIED,
    ];

    const executives = await prisma.user.findMany({
      where: {
        organizationId,
        managerId,
        role: Role.EXECUTIVE,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const executiveIds = executives.map((executive) => executive.id);
    const scopedUserIds = [managerId, ...executiveIds];

    const managerDirectLeadScope: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
      assignedToId: managerId,
    };

    const teamLeadScope: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
      assignedToId: { in: executiveIds },
    };

    const teamLeadAssignedByManagerScope: Prisma.LeadWhereInput = {
      ...teamLeadScope,
      assignedById: managerId,
    };

    const managerTeamLeadScope: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
      assignedToId: { in: scopedUserIds },
    };

    const prospectScope: Prisma.ProspectWhereInput = {
      organizationId,
      lead: { deletedAt: null },
      OR: [
        { assignedToId: { in: scopedUserIds } },
        { lead: { assignedToId: { in: scopedUserIds } } },
      ],
    };

    const teamAssignedProspectScope: Prisma.ProspectWhereInput = {
      organizationId,
      lead: {
        deletedAt: null,
        assignedToId: { in: executiveIds },
        assignedById: managerId,
      },
    };

    const quotationScope: Prisma.QuotationWhereInput = {
      organizationId,
      deletedAt: null,
      OR: [
        { assignedToId: { in: scopedUserIds } },
        { createdById: { in: scopedUserIds } },
      ],
    };

    const executiveQuotationScope: Prisma.QuotationWhereInput = {
      organizationId,
      deletedAt: null,
      OR: [
        { assignedToId: { in: executiveIds } },
        { createdById: { in: executiveIds } },
      ],
    };

    const followUpOwnerScope: Prisma.ProspectWhereInput = {
      AND: [
        {
          organizationId,
          lead: { deletedAt: null },
          stage: { notIn: ["WON", "LOST"] },
        },
        {
          OR: [
            { followUpAssignedToId: { in: scopedUserIds } },
            {
              AND: [
                { followUpAssignedToId: null },
                { assignedToId: { in: scopedUserIds } },
              ],
            },
          ],
        },
      ],
    };

    const followUpActivityScope: Prisma.ProspectWhereInput = {
      AND: [
        {
          organizationId,
          lead: { deletedAt: null },
        },
        {
          OR: [
            { followUpAssignedToId: { in: scopedUserIds } },
            {
              AND: [
                { followUpAssignedToId: null },
                { assignedToId: { in: scopedUserIds } },
              ],
            },
          ],
        },
      ],
    };

    const todayOverdueFollowUpFilter: Prisma.ProspectWhereInput = {
      AND: [
        followUpOwnerScope,
        { followUpDate: { gte: startOfDay, lt: endOfDay } },
        { followUpTime: { not: null, lt: currentTime } },
      ],
    };

    const overdueFollowUpFilter: Prisma.ProspectWhereInput = {
      AND: [
        followUpOwnerScope,
        { followUpDate: { not: null } },
        {
          OR: [
            { followUpDate: { lt: startOfDay } },
            {
              AND: [
                { followUpDate: { gte: startOfDay, lt: endOfDay } },
                { followUpTime: { not: null, lt: currentTime } },
              ],
            },
          ],
        },
      ],
    };

    const [
      leadsAssigned,
      leadsAssignedToTeam,
      openLeads,
      prospects,
      quotationsPending,
      quotationsApproved,
      customersConverted,
      leadStatusGroups,
      funnelStatusGroups,
      convertedLeads,
      leadSourceGroups,
      overdueFollowUps,
      followUpActivities,
      todaysOverdueFollowUps,
      leadsForPerformance,
      prospectsForPerformance,
      quotationsForPerformance,
    ] = await Promise.all([
      prisma.lead.count({ where: managerDirectLeadScope }),
      prisma.lead.count({ where: teamLeadAssignedByManagerScope }),
      prisma.lead.count({
        where: {
          ...managerTeamLeadScope,
          status: { in: openLeadStatuses },
        },
      }),
      prisma.prospect.count({ where: prospectScope }),
      prisma.quotation.count({
        where: { ...quotationScope, status: "PENDING" },
      }),
      prisma.quotation.count({
        where: { ...quotationScope, status: "APPROVED" },
      }),
      prisma.prospect.count({
        where: { ...teamAssignedProspectScope, stage: "WON" },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: managerTeamLeadScope,
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: {
          ...managerTeamLeadScope,
          convertedAt: null,
        },
        _count: { id: true },
      }),
      prisma.lead.count({
        where: { ...managerTeamLeadScope, convertedAt: { not: null } },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: managerTeamLeadScope,
        _count: { id: true },
      }),
      prisma.prospect.count({ where: overdueFollowUpFilter }),
      prisma.prospectActivity.findMany({
        where: {
          type: "FOLLOW_UP_SET",
          prospect: followUpActivityScope,
        },
        select: {
          metadata: true,
          prospect: {
            select: {
              assignedToId: true,
              followUpAssignedToId: true,
            },
          },
        },
      }),
      prisma.prospect.count({ where: todayOverdueFollowUpFilter }),
      prisma.lead.findMany({
        where: teamLeadScope,
        select: {
          assignedToId: true,
          status: true,
        },
      }),
      prisma.prospect.findMany({
        where: {
          organizationId,
          lead: { deletedAt: null },
          assignedToId: { in: executiveIds },
        },
        select: {
          assignedToId: true,
          stage: true,
        },
      }),
      prisma.quotation.findMany({
        where: executiveQuotationScope,
        select: {
          assignedToId: true,
          createdById: true,
          status: true,
        },
      }),
    ]);

    const statusCounts = leadStatusGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      },
      {},
    );

    const managerTeamLeadTotal = statusOrder.reduce(
      (total, status) => total + (statusCounts[status] ?? 0),
      0,
    );

    const leadStatusDistribution = {
      total: managerTeamLeadTotal,
      items: statusOrder.map((status) => {
        const count = statusCounts[status] ?? 0;
        return {
          key: status,
          label: status === LeadStatus.UNQUALIFIED ? "Lost" : labelFromKey(status),
          count,
          percentage: roundPercentage(count, managerTeamLeadTotal),
        };
      }),
    };

    const funnelStatusCounts = funnelStatusGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      },
      {},
    );

    const leadStatusFunnel = {
      total: managerTeamLeadTotal,
      items: [
        ...statusOrder.map((status) => ({
          key: status,
          label: status === LeadStatus.UNQUALIFIED ? "Lost" : labelFromKey(status),
          count: funnelStatusCounts[status] ?? 0,
        })),
        {
          key: "CONVERTED",
          label: "Converted",
          count: convertedLeads,
        },
      ].map((item) => ({
        ...item,
        percentage: roundPercentage(item.count, managerTeamLeadTotal),
      })),
    };

    const leadSourceWiseItems = leadSourceGroups
      .map((group) => ({
        key: group.source ?? "NOT_SET",
        label: labelFromKey(group.source),
        count: group._count.id,
        percentage: roundPercentage(group._count.id, managerTeamLeadTotal),
      }))
      .sort((a, b) => b.count - a.count);

    let dailyScheduledFollowUps = 0;
    let dailyCompletedFollowUps = 0;

    followUpActivities.forEach((activity) => {
      const metadata = readFollowUpMetadata(activity.metadata);
      if (metadataDateKey(metadata.followUpDate) !== todayKey) return;

      dailyScheduledFollowUps += 1;
      if (metadata.completed) dailyCompletedFollowUps += 1;
    });

    const dailyPendingFollowUps = Math.max(
      0,
      dailyScheduledFollowUps - dailyCompletedFollowUps,
    );

    const performanceByExecutive = new Map(
      executives.map((executive) => [
        executive.id,
        {
          executiveId: executive.id,
          executiveName: fullName(executive),
          assignedLeads: 0,
          openLeads: 0,
          prospects: 0,
          quotationsPending: 0,
          quotationsApproved: 0,
          customersConverted: 0,
          scheduledFollowUps: 0,
          completedFollowUps: 0,
        },
      ]),
    );

    leadsForPerformance.forEach((lead) => {
      if (!lead.assignedToId) return;

      const performance = performanceByExecutive.get(lead.assignedToId);
      if (!performance) return;

      performance.assignedLeads += 1;
      if (openLeadStatuses.includes(lead.status)) {
        performance.openLeads += 1;
      }
    });

    prospectsForPerformance.forEach((prospect) => {
      if (!prospect.assignedToId) return;

      const performance = performanceByExecutive.get(prospect.assignedToId);
      if (!performance) return;

      performance.prospects += 1;
      if (prospect.stage === "WON") {
        performance.customersConverted += 1;
      }
    });

    quotationsForPerformance.forEach((quotation) => {
      const ownerId = quotation.assignedToId ?? quotation.createdById;
      const performance = performanceByExecutive.get(ownerId);
      if (!performance) return;

      if (quotation.status === "PENDING") {
        performance.quotationsPending += 1;
      } else if (quotation.status === "APPROVED") {
        performance.quotationsApproved += 1;
      }
    });

    followUpActivities.forEach((activity) => {
      const assigneeId =
        activity.prospect.followUpAssignedToId ?? activity.prospect.assignedToId;
      if (!assigneeId) return;

      const performance = performanceByExecutive.get(assigneeId);
      if (!performance) return;

      const metadata = readFollowUpMetadata(activity.metadata);
      performance.scheduledFollowUps += 1;
      if (metadata.completed) {
        performance.completedFollowUps += 1;
      }
    });

    const executivePerformance = Array.from(performanceByExecutive.values())
      .map((performance) => ({
        ...performance,
        conversionPercentage: roundPercentage(
          performance.customersConverted,
          performance.assignedLeads,
        ),
        followUpCompletionPercentage: roundPercentage(
          performance.completedFollowUps,
          performance.scheduledFollowUps,
        ),
      }))
      .sort((a, b) => b.assignedLeads - a.assignedLeads)
      .slice(0, 6);

    return {
      kpis: {
        leadsAssigned,
        leadsAssignedToTeam,
        openLeads,
        prospects,
        quotationsPending,
        quotationsApproved,
        customersConverted,
        teamConversionPercentage: roundPercentage(
          customersConverted,
          leadsAssignedToTeam,
        ),
        followUpsDueToday: dailyScheduledFollowUps,
        overdueFollowUps,
      },
      executivePerformance,
      dailyFollowUpCompletion: {
        scheduled: dailyScheduledFollowUps,
        completed: dailyCompletedFollowUps,
        pending: dailyPendingFollowUps,
        overdue: todaysOverdueFollowUps,
        completionPercentage: roundPercentage(
          dailyCompletedFollowUps,
          dailyScheduledFollowUps,
        ),
      },
      leadStatusDistribution,
      leadSourceWise: {
        total: managerTeamLeadTotal,
        items: leadSourceWiseItems,
      },
      leadStatusFunnel,
    };
  },

  /* ═══════════════════════════════════════════════════════════════
     EXECUTIVE DASHBOARD
  ═══════════════════════════════════════════════════════════════ */
  async getExecutiveStats(
    executiveId: string,
    organizationId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<ExecutiveStatsDTO> {
    const now = new Date();
    const overdueLimit = new Date(now.getTime() - 5 * 60 * 1000);
    const currentTime = `${String(overdueLimit.getHours()).padStart(2, "0")}:${String(overdueLimit.getMinutes()).padStart(2, "0")}`;

    const monthWindowStart = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth() - 5,
      1,
    );
    monthWindowStart.setHours(0, 0, 0, 0);

    const getWeekStart = (date: Date) => {
      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      const daysSinceMonday = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      return weekStart;
    };

    const weekWindowStart = getWeekStart(startOfDay);
    weekWindowStart.setDate(weekWindowStart.getDate() - 5 * 7);

    const performanceWindowStart =
      monthWindowStart < weekWindowStart ? monthWindowStart : weekWindowStart;

    const leadScope: Prisma.LeadWhereInput = {
      assignedToId: executiveId,
      organizationId,
      deletedAt: null,
    };

    const prospectScope: Prisma.ProspectWhereInput = {
      organizationId,
      lead: { deletedAt: null },
      assignedToId: executiveId,
    };

    const followUpScope: Prisma.ProspectWhereInput = {
      AND: [
        {
          organizationId,
          lead: { deletedAt: null },
          stage: { notIn: ["WON", "LOST"] },
        },
        {
          OR: [
            { followUpAssignedToId: executiveId },
            {
              AND: [
                { followUpAssignedToId: null },
                { assignedToId: executiveId },
              ],
            },
          ],
        },
      ],
    };

    const quotationScope: Prisma.QuotationWhereInput = {
      organizationId,
      deletedAt: null,
      OR: [
        { assignedToId: executiveId },
        { createdById: executiveId },
      ],
    };

    const todayFollowUpFilter: Prisma.ProspectWhereInput = {
      AND: [
        followUpScope,
        {
          followUpDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      ],
    };

    const overdueFollowUpFilter: Prisma.ProspectWhereInput = {
      AND: [
        followUpScope,
        { followUpDate: { not: null } },
        {
          OR: [
            { followUpDate: { lt: startOfDay } },
            {
              AND: [
                { followUpDate: { gte: startOfDay, lt: endOfDay } },
                { followUpTime: { not: null, lt: currentTime } },
              ],
            },
          ],
        },
      ],
    };

    const upcomingFollowUpFilter: Prisma.ProspectWhereInput = {
      AND: [
        followUpScope,
        { followUpDate: { not: null } },
        {
          OR: [
            { followUpDate: { gt: startOfDay } },
            {
              AND: [
                { followUpDate: { gte: startOfDay, lt: endOfDay } },
                {
                  OR: [
                    { followUpTime: null },
                    { followUpTime: { gte: currentTime } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const [
      myLeads,
      newLeads,
      openLeads,
      todaysFollowUps,
      overdueFollowUps,
      prospects,
      quotationsSent,
      customersWon,
      directLostLeads,
      lostProspects,
      leadStatusGroups,
      convertedLeads,
      leadSourceGroups,
      upcomingFollowUpsRaw,
      performanceLeadsRaw,
      performanceProspectsRaw,
      performanceQuotationsRaw,
      performanceCustomersRaw,
      performanceDirectLostLeadsRaw,
      performanceLostProspectsRaw,
      performanceFollowUpsRaw,
    ] = await Promise.all([
      prisma.lead.count({
        where: leadScope,
      }),
      prisma.lead.count({
        where: { ...leadScope, status: "NEW", convertedAt: null },
      }),
      prisma.lead.count({
        where: {
          ...leadScope,
          status: { in: ["NEW", "ATTEMPTED_CONTACT", "CONTACTED"] },
          convertedAt: null,
        },
      }),
      prisma.prospect.count({ where: todayFollowUpFilter }),
      prisma.prospect.count({ where: overdueFollowUpFilter }),
      prisma.prospect.count({ where: prospectScope }),
      prisma.quotation.count({ where: quotationScope }),
      prisma.prospect.count({ where: { ...prospectScope, stage: "WON" } }),
      prisma.lead.count({
        where: { ...leadScope, status: "UNQUALIFIED", convertedAt: null },
      }),
      prisma.prospect.count({ where: { ...prospectScope, stage: "LOST" } }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { ...leadScope, convertedAt: null },
        _count: { id: true },
      }),
      prisma.lead.count({
        where: { ...leadScope, convertedAt: { not: null } },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: leadScope,
        _count: { id: true },
      }),
      prisma.prospect.findMany({
        where: upcomingFollowUpFilter,
        select: {
          id: true,
          prospectNo: true,
          followUpDate: true,
          followUpTime: true,
          followUpType: true,
          followUpNotes: true,
          lead: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: [{ followUpDate: "asc" }, { followUpTime: "asc" }],
        take: 6,
      }),
      prisma.lead.findMany({
        where: {
          ...leadScope,
          OR: [
            { assignedAt: { gte: performanceWindowStart } },
            { createdAt: { gte: performanceWindowStart } },
          ],
        },
        select: {
          createdAt: true,
          assignedAt: true,
        },
      }),
      prisma.prospect.findMany({
        where: { ...prospectScope, createdAt: { gte: performanceWindowStart } },
        select: { createdAt: true },
      }),
      prisma.quotation.findMany({
        where: { ...quotationScope, date: { gte: performanceWindowStart } },
        select: { date: true },
      }),
      prisma.prospect.findMany({
        where: {
          ...prospectScope,
          stage: "WON",
          updatedAt: { gte: performanceWindowStart },
        },
        select: { updatedAt: true },
      }),
      prisma.lead.findMany({
        where: {
          ...leadScope,
          status: "UNQUALIFIED",
          convertedAt: null,
          updatedAt: { gte: performanceWindowStart },
        },
        select: { updatedAt: true },
      }),
      prisma.prospect.findMany({
        where: {
          ...prospectScope,
          stage: "LOST",
          updatedAt: { gte: performanceWindowStart },
        },
        select: { updatedAt: true },
      }),
      prisma.prospect.findMany({
        where: {
          ...followUpScope,
          followUpDate: { gte: performanceWindowStart },
        },
        select: { followUpDate: true },
      }),
    ]);

    const lostLeads = directLostLeads + lostProspects;

    const leadStatusMap = leadStatusGroups.reduce<Record<string, number>>(
      (acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      },
      {},
    );

    const leadStatusFunnel = {
      total: myLeads,
      items: [
        {
          key: "NEW",
          label: "New",
          count: leadStatusMap.NEW ?? 0,
        },
        {
          key: "ATTEMPTED_CONTACT",
          label: "Attempted Contact",
          count: leadStatusMap.ATTEMPTED_CONTACT ?? 0,
        },
        {
          key: "CONTACTED",
          label: "Contacted",
          count: leadStatusMap.CONTACTED ?? 0,
        },
        {
          key: "QUALIFIED",
          label: "Qualified",
          count: leadStatusMap.QUALIFIED ?? 0,
        },
        {
          key: "UNQUALIFIED",
          label: "Lost",
          count: leadStatusMap.UNQUALIFIED ?? 0,
        },
        {
          key: "CONVERTED",
          label: "Converted",
          count: convertedLeads,
        },
      ].map((item) => ({
        ...item,
        percentage: roundPercentage(item.count, myLeads),
      })),
    };

    const leadFunnel = {
      total: myLeads,
      items: [
        { key: "MY_LEADS", label: "My Leads", count: myLeads },
        { key: "NEW_LEADS", label: "New Leads", count: newLeads },
        { key: "OPEN_LEADS", label: "Open Leads", count: openLeads },
        { key: "PROSPECTS", label: "Prospects", count: prospects },
        {
          key: "QUOTATIONS_SENT",
          label: "Quotations Sent",
          count: quotationsSent,
        },
        { key: "CUSTOMERS_WON", label: "Customers Won", count: customersWon },
        { key: "LOST_LEADS", label: "Lost Leads", count: lostLeads },
      ].map((item) => ({
        ...item,
        percentage: roundPercentage(item.count, myLeads),
      })),
    };

    const leadSourceWiseItems = leadSourceGroups
      .map((group) => ({
        key: group.source ?? "NOT_SET",
        label: group.source
          ? group.source
              .toLowerCase()
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ")
          : "Not Set",
        count: group._count.id,
        percentage: roundPercentage(group._count.id, myLeads),
      }))
      .sort((a, b) => b.count - a.count);

    const createPerformanceBucket = (period: string) => ({
      period,
      leads: 0,
      prospects: 0,
      quotationsSent: 0,
      customersWon: 0,
      lostLeads: 0,
      followUps: 0,
    });

    const monthBuckets = new Map<
      string,
      ReturnType<typeof createPerformanceBucket>
    >();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(
        monthWindowStart.getFullYear(),
        monthWindowStart.getMonth() + index,
        1,
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets.set(
        key,
        createPerformanceBucket(
          date.toLocaleString("en-US", { month: "short", year: "numeric" }),
        ),
      );
    }

    const weekBuckets = new Map<
      string,
      ReturnType<typeof createPerformanceBucket>
    >();
    for (let index = 0; index < 6; index += 1) {
      const date = new Date(weekWindowStart);
      date.setDate(weekWindowStart.getDate() + index * 7);
      const key = date.toISOString().split("T")[0];
      weekBuckets.set(
        key,
        createPerformanceBucket(
          date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
        ),
      );
    }

    const addToPerformance = (
      date: Date | null | undefined,
      metric: keyof Omit<
        ReturnType<typeof createPerformanceBucket>,
        "period"
      >,
    ) => {
      if (!date) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthBucket = monthBuckets.get(monthKey);
      if (monthBucket) {
        monthBucket[metric] += 1;
      }

      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split("T")[0];
      const weekBucket = weekBuckets.get(weekKey);
      if (weekBucket) {
        weekBucket[metric] += 1;
      }
    };

    performanceLeadsRaw.forEach((lead) =>
      addToPerformance(lead.assignedAt ?? lead.createdAt, "leads"),
    );
    performanceProspectsRaw.forEach((prospect) =>
      addToPerformance(prospect.createdAt, "prospects"),
    );
    performanceQuotationsRaw.forEach((quotation) =>
      addToPerformance(quotation.date, "quotationsSent"),
    );
    performanceCustomersRaw.forEach((prospect) =>
      addToPerformance(prospect.updatedAt, "customersWon"),
    );
    performanceDirectLostLeadsRaw.forEach((lead) =>
      addToPerformance(lead.updatedAt, "lostLeads"),
    );
    performanceLostProspectsRaw.forEach((prospect) =>
      addToPerformance(prospect.updatedAt, "lostLeads"),
    );
    performanceFollowUpsRaw.forEach((prospect) =>
      addToPerformance(prospect.followUpDate, "followUps"),
    );

    return {
      myLeads,
      newLeads,
      openLeads,
      todaysFollowUps,
      overdueFollowUps,
      prospects,
      quotationsSent,
      customersWon,
      lostLeads,
      leadFunnel,
      performance: {
        monthly: Array.from(monthBuckets.values()),
        weekly: Array.from(weekBuckets.values()),
      },
      leadSourceWise: {
        total: myLeads,
        items: leadSourceWiseItems,
      },
      leadStatusFunnel,
      upcomingFollowUps: upcomingFollowUpsRaw.map((prospect) => ({
        id: prospect.id,
        prospectId: prospect.id,
        prospectNo: prospect.prospectNo,
        leadName: prospect.lead ? leadDisplayName(prospect.lead) : "Unknown Lead",
        followUpDate: prospect.followUpDate!.toISOString(),
        followUpTime: prospect.followUpTime ?? null,
        followUpType: prospect.followUpType ?? null,
        notes: prospect.followUpNotes ?? null,
      })),
    };
  },
};
