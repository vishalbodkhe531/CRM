import { prisma } from "../../config/db";
import { Role, Prisma, LeadSource } from "@prisma/client";
import type { SafeUser } from "../../types/user.types";

import {
  istStartOfDay,
  istEndOfDay,
  istStartOfWeek,
  istStartOfMonth,
} from "../../utils/business/dateUtils";

export const getReportDateRange = (range?: string, from?: string, to?: string) => {
  const now = new Date();
  let startDate = new Date(0); // far past
  let endDate = istEndOfDay(now);

  if (range === "Today") {
    startDate = istStartOfDay(now);
    endDate = istEndOfDay(now);
  } else if (range === "This Week") {
    startDate = istStartOfWeek(now);
    endDate = istEndOfDay(now);
  } else if (range === "This Month") {
    startDate = istStartOfMonth(now);
    endDate = istEndOfDay(now);
  } else if (from || to) {
    if (from) startDate = istStartOfDay(new Date(from));
    if (to) endDate = istEndOfDay(new Date(to));
  }
  return { startDate, endDate };
};

const getRoleFilters = (user: SafeUser, requestedExecId?: string) => {
  let targetExecId = requestedExecId;
  if (user.role === Role.EXECUTIVE) {
    targetExecId = user.id;
  }

  const leadFilters: Prisma.LeadWhereInput = {};
  const prospectFilters: Prisma.ProspectWhereInput = {};
  const quotationFilters: Prisma.QuotationWhereInput = {};
  const activityFilters: Prisma.ProspectActivityWhereInput = {};

  if (user.role === Role.EXECUTIVE) {
    leadFilters.assignedToId = user.id;
    prospectFilters.assignedToId = user.id;
    quotationFilters.OR = [
      { assignedToId: user.id },
      { createdById: user.id },
    ];
    activityFilters.createdById = user.id;
  } else if (user.role === Role.MANAGER) {
    const managerClause = {
      OR: [
        { id: user.id },
        { managerId: user.id }
      ]
    };
    leadFilters.assignedTo = managerClause;
    prospectFilters.assignedTo = managerClause;
    quotationFilters.OR = [
      { createdById: user.id },
      { assignedTo: managerClause },
    ];
    activityFilters.createdBy = managerClause;

    if (targetExecId) {
      leadFilters.assignedToId = targetExecId;
      prospectFilters.assignedToId = targetExecId;
      quotationFilters.assignedToId = targetExecId;
      activityFilters.createdById = targetExecId;
    }
  } else {
    // ADMIN / SUPER_ADMIN
    if (targetExecId) {
      leadFilters.assignedToId = targetExecId;
      prospectFilters.assignedToId = targetExecId;
      quotationFilters.assignedToId = targetExecId;
      activityFilters.createdById = targetExecId;
    }
  }

  return { leadFilters, prospectFilters, quotationFilters, activityFilters };
};

export const reportsRepository = {
  getSummaryStats: async (user: SafeUser, organizationId: string, query: any) => {
    const { startDate, endDate } = getReportDateRange(query.range, query.from, query.to);
    const { leadFilters, prospectFilters, quotationFilters } = getRoleFilters(user, query.executiveId);

    const [totalLeads, totalProspects, totalQuotations, approvedQuotations] = await Promise.all([
      prisma.lead.count({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
          ...leadFilters,
          deletedAt: null,
        }
      }),
      prisma.prospect.count({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
          ...prospectFilters,
          deletedAt: null,
          lead: { deletedAt: null }
        }
      }),
      prisma.quotation.count({
        where: {
          organizationId,
          date: { gte: startDate, lte: endDate },
          ...quotationFilters,
          deletedAt: null,
        }
      }),
      prisma.quotation.aggregate({
        where: {
          organizationId,
          status: "APPROVED",
          date: { gte: startDate, lte: endDate },
          ...quotationFilters,
          deletedAt: null,
        },
        _sum: { grandTotal: true }
      })
    ]);

    const totalRevenue = Number(approvedQuotations._sum.grandTotal ?? 0);

    const convertedLeads = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
        ...leadFilters,
        convertedAt: { not: null },
        deletedAt: null,
      }
    });

    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

    return {
      totalLeads,
      totalProspects,
      totalQuotations,
      totalRevenue,
      conversionRate
    };
  },

  getLeadReports: async (user: SafeUser, organizationId: string, query: any) => {
    const { startDate, endDate } = getReportDateRange(query.range, query.from, query.to);
    const { leadFilters } = getRoleFilters(user, query.executiveId);

    // Apply lead source filter if passed
    const extraFilters: Prisma.LeadWhereInput = {};
    if (query.source) {
      extraFilters.source = query.source as LeadSource;
    }

    const [statusNew, statusContacted, statusQualified, statusLost, statusConverted] = await Promise.all([
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, status: "NEW", convertedAt: null, deletedAt: null, ...leadFilters, ...extraFilters }
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, status: { in: ["CONTACTED", "ATTEMPTED_CONTACT"] }, convertedAt: null, deletedAt: null, ...leadFilters, ...extraFilters }
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, status: "QUALIFIED", convertedAt: null, deletedAt: null, ...leadFilters, ...extraFilters }
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, status: "UNQUALIFIED", convertedAt: null, deletedAt: null, ...leadFilters, ...extraFilters }
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, convertedAt: { not: null }, deletedAt: null, ...leadFilters, ...extraFilters }
      })
    ]);

    const leadsForSource = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
        ...leadFilters,
        ...extraFilters,
        deletedAt: null,
      },
      select: { source: true }
    });

    const sourceCounts = {
      Website: 0,
      Referral: 0,
      "Social Media": 0,
      Campaign: 0,
      "Direct Inquiry": 0
    };

    leadsForSource.forEach(l => {
      const src = l.source;
      if (src === "WEBSITE") {
        sourceCounts["Website"]++;
      } else if (src === "REFERENCE") {
        sourceCounts["Referral"]++;
      } else if (src && ["SOCIAL_MEDIA", "FACEBOOK", "INSTAGRAM", "LINKEDIN"].includes(src)) {
        sourceCounts["Social Media"]++;
      } else if (src && ["ADVERTISE", "GOOGLE_ADS", "EVENT", "TRADE_SHOW"].includes(src)) {
        sourceCounts["Campaign"]++;
      } else {
        sourceCounts["Direct Inquiry"]++;
      }
    });

    const activeUsers = await prisma.user.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        role: { in: [Role.EXECUTIVE, Role.MANAGER] },
        ...(user.role === Role.EXECUTIVE && { id: user.id }),
        ...(user.role === Role.MANAGER && {
          OR: [{ id: user.id }, { managerId: user.id }]
        })
      },
      select: { id: true, firstName: true, lastName: true }
    });

    const leadsForExec = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
        ...leadFilters,
        ...extraFilters,
        deletedAt: null,
        assignedToId: { in: activeUsers.map(u => u.id) }
      },
      select: { assignedToId: true, status: true, convertedAt: true }
    });

    const byExecutive = activeUsers.map(u => {
      const myLeads = leadsForExec.filter(l => l.assignedToId === u.id);
      const totalAssigned = myLeads.length;
      const converted = myLeads.filter(l => l.convertedAt !== null).length;
      const lost = myLeads.filter(l => l.status === "UNQUALIFIED" && l.convertedAt === null).length;
      const active = totalAssigned - converted - lost;

      return {
        executiveId: u.id,
        executiveName: `${u.firstName} ${u.lastName}`,
        totalAssigned,
        active,
        converted,
        lost
      };
    });

    // Detailed tabular records
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.LeadWhereInput = {
      organizationId,
      createdAt: { gte: startDate, lte: endDate },
      ...leadFilters,
      ...extraFilters,
      deletedAt: null
    };

    const [totalRecords, records] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.findMany({
        where: baseWhere,
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      })
    ]);

    const formattedRecords = records.map(l => ({
      id: l.id,
      leadNo: l.leadNo,
      name: `${l.firstName} ${l.lastName}`,
      companyName: l.companyName || "-",
      email: l.email,
      mobile: l.mobile,
      source: l.source || "OTHER",
      status: l.convertedAt ? "CONVERTED" : l.status,
      executiveName: l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : "Unassigned",
      createdAt: l.createdAt.toISOString()
    }));

    return {
      byStatus: [
        { status: "New", count: statusNew },
        { status: "Contacted", count: statusContacted },
        { status: "Qualified", count: statusQualified },
        { status: "Lost", count: statusLost },
        { status: "Converted", count: statusConverted }
      ],
      bySource: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })),
      byExecutive,
      records: formattedRecords,
      meta: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    };
  },

  getProspectReports: async (user: SafeUser, organizationId: string, query: any) => {
    const { startDate, endDate } = getReportDateRange(query.range, query.from, query.to);
    const { prospectFilters, leadFilters } = getRoleFilters(user, query.executiveId);

    const stageCounts = await prisma.prospect.groupBy({
      by: ["stage"],
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
        ...prospectFilters,
        deletedAt: null,
        lead: { deletedAt: null }
      },
      _count: { id: true }
    });

    const displayStages = {
      "Initial Discussion": 0,
      "Requirement Gathering": 0,
      "Proposal Sent": 0,
      "Negotiation": 0,
      "Won": 0,
      "Lost": 0
    };

    stageCounts.forEach(sc => {
      const stage = sc.stage;
      if (stage === "REQUIREMENT") {
        displayStages["Requirement Gathering"] += sc._count.id;
      } else if (stage === "FOLLOW_UP" || stage === "DEMO") {
        displayStages["Initial Discussion"] += sc._count.id;
      } else if (stage === "PROPOSAL") {
        displayStages["Proposal Sent"] += sc._count.id;
      } else if (stage === "NEGOTIATION") {
        displayStages["Negotiation"] += sc._count.id;
      } else if (stage === "WON") {
        displayStages["Won"] += sc._count.id;
      } else if (stage === "LOST") {
        displayStages["Lost"] += sc._count.id;
      }
    });

    // Conversion rates
    const [totalLeads, convertedLeads, totalProspects, wonProspects] = await Promise.all([
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, ...leadFilters, deletedAt: null }
      }),
      prisma.lead.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, ...leadFilters, convertedAt: { not: null }, deletedAt: null }
      }),
      prisma.prospect.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, ...prospectFilters, deletedAt: null, lead: { deletedAt: null } }
      }),
      prisma.prospect.count({
        where: { organizationId, createdAt: { gte: startDate, lte: endDate }, stage: "WON", ...prospectFilters, deletedAt: null, lead: { deletedAt: null } }
      })
    ]);

    const leadToProspectRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;
    const prospectToCustomerRate = totalProspects > 0 ? Number(((wonProspects / totalProspects) * 100).toFixed(2)) : 0;

    // Detailed tabular records
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.ProspectWhereInput = {
      organizationId,
      createdAt: { gte: startDate, lte: endDate },
      ...prospectFilters,
      deletedAt: null,
      lead: { deletedAt: null }
    };

    const [totalRecords, records] = await Promise.all([
      prisma.prospect.count({ where: baseWhere }),
      prisma.prospect.findMany({
        where: baseWhere,
        include: {
          lead: true,
          assignedTo: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      })
    ]);

    const formattedRecords = records.flatMap(p => {
      if (!p.lead) {
        return [];
      }

      return [{
        id: p.id,
        prospectNo: p.prospectNo,
        leadNo: p.lead.leadNo,
        name: `${p.lead.firstName} ${p.lead.lastName}`,
        companyName: p.lead.companyName || "-",
        stage: p.stage,
        expectedValue: p.expectedValue || 0,
        closeDate: p.closeDate ? p.closeDate.toISOString().split("T")[0] : "-",
        executiveName: p.assignedTo ? `${p.assignedTo.firstName} ${p.assignedTo.lastName}` : "Unassigned",
        createdAt: p.createdAt.toISOString()
      }];
    });

    return {
      stageDistribution: Object.entries(displayStages).map(([stage, count]) => ({ stage, count })),
      conversionRate: {
        leadToProspectRate,
        prospectToCustomerRate,
        totalLeads,
        convertedLeads,
        totalProspects,
        wonProspects
      },
      records: formattedRecords,
      meta: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    };
  },

  getQuotationReports: async (user: SafeUser, organizationId: string, query: any) => {
    const { startDate, endDate } = getReportDateRange(query.range, query.from, query.to);
    const { quotationFilters } = getRoleFilters(user, query.executiveId);

    const statusCounts = await prisma.quotation.groupBy({
      by: ["status"],
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
        ...quotationFilters,
        deletedAt: null
      },
      _count: { id: true }
    });

    const displayStatuses = {
      Approved: 0,
      Pending: 0,
      Rejected: 0
    };

    statusCounts.forEach(sc => {
      const status = sc.status;
      if (status === "APPROVED") {
        displayStatuses["Approved"] = sc._count.id;
      } else if (status === "PENDING") {
        displayStatuses["Pending"] = sc._count.id;
      } else if (status === "REJECTED") {
        displayStatuses["Rejected"] = sc._count.id;
      }
    });

    const [approvedQuotations, pendingQuotations] = await Promise.all([
      prisma.quotation.aggregate({
        where: { organizationId, status: "APPROVED", date: { gte: startDate, lte: endDate }, ...quotationFilters, deletedAt: null },
        _sum: { grandTotal: true }
      }),
      prisma.quotation.aggregate({
        where: { organizationId, status: "PENDING", date: { gte: startDate, lte: endDate }, ...quotationFilters, deletedAt: null },
        _sum: { grandTotal: true }
      })
    ]);

    const approvedValue = Number(approvedQuotations._sum.grandTotal ?? 0);
    const pendingValue = Number(pendingQuotations._sum.grandTotal ?? 0);

    const totalRevenue = approvedValue;

    // Monthly revenue trend
    const quotationsForTrend = await prisma.quotation.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
        ...quotationFilters,
        deletedAt: null,
      },
      select: { date: true, status: true, grandTotal: true },
      orderBy: { date: "asc" }
    });

    const trendMap: Record<string, { approved: number; pending: number }> = {};
    quotationsForTrend.forEach(q => {
      const d = new Date(q.date);
      const monthYear = d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
      if (!trendMap[monthYear]) {
        trendMap[monthYear] = { approved: 0, pending: 0 };
      }
      const val = Number(q.grandTotal);
      if (q.status === "APPROVED") {
        trendMap[monthYear].approved += val;
      } else if (q.status === "PENDING") {
        trendMap[monthYear].pending += val;
      }
    });

    const monthlyTrend = Object.entries(trendMap).map(([month, data]) => ({
      month,
      approved: Number(data.approved.toFixed(2)),
      pending: Number(data.pending.toFixed(2))
    }));

    // Detailed tabular records
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.QuotationWhereInput = {
      organizationId,
      date: { gte: startDate, lte: endDate },
      ...quotationFilters,
      deletedAt: null
    };

    const [totalRecords, records] = await Promise.all([
      prisma.quotation.count({ where: baseWhere }),
      prisma.quotation.findMany({
        where: baseWhere,
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { date: "desc" },
        skip,
        take: limit
      })
    ]);

    const formattedRecords = records.map(q => {
      return {
        id: q.id,
        quotationNo: q.quotationNo,
        partyName: q.partyName,
        refNo: q.refNo,
        date: q.date.toISOString().split("T")[0],
        status: q.status,
        subtotal: Number(q.subtotal),
        taxTotal: Number(q.taxTotal),
        grandTotal: Number(q.grandTotal),
        executiveName: q.assignedTo ? `${q.assignedTo.firstName} ${q.assignedTo.lastName}` : "Unassigned"
      };
    });

    return {
      byStatus: Object.entries(displayStatuses).map(([status, count]) => ({ status, count })),
      revenue: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        approvedValue: Number(approvedValue.toFixed(2)),
        pendingValue: Number(pendingValue.toFixed(2))
      },
      monthlyTrend,
      records: formattedRecords,
      meta: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    };
  },

  getPerformanceReports: async (user: SafeUser, organizationId: string, query: any) => {
    const { startDate, endDate } = getReportDateRange(query.range, query.from, query.to);
    const { leadFilters, activityFilters } = getRoleFilters(user, query.executiveId);

    const activeUsers = await prisma.user.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        role: { in: [Role.EXECUTIVE, Role.MANAGER] },
        ...(user.role === Role.EXECUTIVE && { id: user.id }),
        ...(user.role === Role.MANAGER && {
          OR: [{ id: user.id }, { managerId: user.id }]
        })
      },
      select: { id: true, firstName: true, lastName: true }
    });

    const [leadsForExec, followUps] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
          ...leadFilters,
          deletedAt: null,
          assignedToId: { in: activeUsers.map(u => u.id) }
        },
        select: { assignedToId: true, convertedAt: true }
      }),
      prisma.prospectActivity.findMany({
        where: {
          type: "FOLLOW_UP_SET",
          prospect: {
            OR: [
              { assignedToId: { in: activeUsers.map(u => u.id) } },
              { followUpAssignedToId: { in: activeUsers.map(u => u.id) } }
            ]
          }
        },
        select: {
          createdById: true,
          metadata: true,
          prospect: {
            select: {
              assignedToId: true,
              followUpAssignedToId: true
            }
          }
        }
      })
    ]);

    const executivePerformance = activeUsers.map(u => {
      const myLeads = leadsForExec.filter(l => l.assignedToId === u.id);
      const assignedLeads = myLeads.length;
      const convertedLeads = myLeads.filter(l => l.convertedAt !== null).length;
      const conversionPercentage = assignedLeads > 0 ? Number(((convertedLeads / assignedLeads) * 100).toFixed(2)) : 0;

      const myFollowUps = followUps.filter(f => {
        const assigneeId = f.prospect?.followUpAssignedToId || f.prospect?.assignedToId;
        return assigneeId === u.id;
      });
      
      const myFilteredFollowUps = myFollowUps.filter(f => {
        const meta = f.metadata as any;
        if (!meta || !meta.followUpDate) return false;

        const fDate = new Date(`${meta.followUpDate}T00:00:00.000Z`);
        const inDateRange = fDate >= startDate && fDate <= endDate;
        if (!inDateRange) return false;

        if (query.status) {
          const isCompleted = meta.completedHealth === "DONE";
          if (query.status === "Completed" && !isCompleted) return false;
          if (query.status === "Pending" && isCompleted) return false;
        }

        return true;
      });

      const scheduledFollowUps = myFilteredFollowUps.length;
      const completedFollowUps = myFilteredFollowUps.filter(f => {
        const meta = f.metadata as any;
        return meta?.completedHealth === "DONE";
      }).length;
      const pendingFollowUps = scheduledFollowUps - completedFollowUps;
      const followUpCompletionRate = scheduledFollowUps > 0 ? Number(((completedFollowUps / scheduledFollowUps) * 100).toFixed(2)) : 0;

      return {
        executiveId: u.id,
        executiveName: `${u.firstName} ${u.lastName}`,
        assignedLeads,
        convertedLeads,
        conversionPercentage,
        scheduledFollowUps,
        completedFollowUps,
        pendingFollowUps,
        followUpCompletionRate
      };
    });

    return {
      executivePerformance
    };
  },

  exportCSV: async (user: SafeUser, organizationId: string, type: string, query: any) => {
    // Helper to escape CSV cell fields
    const escape = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
    };

    if (type === "lead") {
      const data = await reportsRepository.getLeadReports(user, organizationId, { ...query, page: 1, limit: 10000 });
      let csv = "Lead No,Name,Company Name,Email,Mobile,Source,Status,Executive,Created Date\n";
      data.records.forEach(r => {
        csv += `${escape(r.leadNo)},${escape(r.name)},${escape(r.companyName)},${escape(r.email)},${escape(r.mobile)},${escape(r.source)},${escape(r.status)},${escape(r.executiveName)},${escape(r.createdAt)}\n`;
      });
      return csv;
    } else if (type === "prospect") {
      const data = await reportsRepository.getProspectReports(user, organizationId, { ...query, page: 1, limit: 10000 });
      let csv = "Prospect No,Lead No,Name,Company Name,Stage,Expected Value,Close Date,Executive,Created Date\n";
      data.records.forEach(r => {
        csv += `${escape(r.prospectNo)},${escape(r.leadNo)},${escape(r.name)},${escape(r.companyName)},${escape(r.stage)},${escape(r.expectedValue)},${escape(r.closeDate)},${escape(r.executiveName)},${escape(r.createdAt)}\n`;
      });
      return csv;
    } else if (type === "quotation") {
      const data = await reportsRepository.getQuotationReports(user, organizationId, { ...query, page: 1, limit: 10000 });
      let csv = "Quotation No,Party Name,Ref No,Date,Status,Subtotal,Tax Total,Grand Total,Executive\n";
      data.records.forEach(r => {
        csv += `${escape(r.quotationNo)},${escape(r.partyName)},${escape(r.refNo)},${escape(r.date)},${escape(r.status)},${escape(r.subtotal)},${escape(r.taxTotal)},${escape(r.grandTotal)},${escape(r.executiveName)}\n`;
      });
      return csv;
    } else if (type === "performance") {
      const data = await reportsRepository.getPerformanceReports(user, organizationId, query);
      let csv = "Executive Name,Assigned Leads,Converted Leads,Conversion %,Scheduled Follow-ups,Completed Follow-ups,Pending Follow-ups,Follow-up Completion %\n";
      data.executivePerformance.forEach(r => {
        csv += `${escape(r.executiveName)},${escape(r.assignedLeads)},${escape(r.convertedLeads)},${escape(r.conversionPercentage)},${escape(r.scheduledFollowUps)},${escape(r.completedFollowUps)},${escape(r.pendingFollowUps)},${escape(r.followUpCompletionRate)}\n`;
      });
      return csv;
    }

    return "";
  }
};
