// ─── Super Admin ─────────────────────────────────────────────────────────────

export interface SuperAdminStatsDTO {
  totalUsers: number;
  totalItems: number;
  totalLeads: number;
  totalOrganizations: number;
  totalProspects: number;
  totalQuotations: number;
  approvedQuotationRevenue: number;
  /**
   * Top organizations by lead count, bounded server-side. Organizations with no
   * leads are absent — the chart is about where leads are.
   */
  organizationLeadDistribution: SuperAdminOrganizationLeadDistributionItem[];
  /**
   * Everything past the charted rows, pooled. Null when there is no remainder.
   * Computed here rather than in the UI because the UI never receives the tail.
   */
  otherOrganizations: {
    organizationCount: number;
    leadCount: number;
    percentage: number;
  } | null;
  leadTrend: {
    monthly: SuperAdminLeadTrendItem[];
    weekly: SuperAdminLeadTrendItem[];
  };
  recentOrganizations: SuperAdminRecentOrganizationItem[];
  /**
   * Live tenants only. `active + suspended === total`; `archived` is counted
   * separately because archiving also forces status to SUSPENDED, so folding it
   * in would double-count it and contradict the Organizations list.
   */
  organizationStatus: {
    active: number;
    suspended: number;
    archived: number;
    total: number;
  };
}

export interface SuperAdminOrganizationLeadDistributionItem {
  organizationId: string;
  organizationName: string;
  leadCount: number;
  percentage: number;
}

export interface SuperAdminLeadTrendItem {
  period: string;
  totalLeads: number;
  conversions: number;
}

export interface SuperAdminRecentOrganizationItem {
  id: string;
  name: string;
  slug: string;
  prefix: string;
  users: number;
  leads: number;
  status: "ACTIVE" | "SUSPENDED";
  createdDate: string;
  exportReportUrl?: string | null;
}

// ─── Admin — Shared sub-types ─────────────────────────────────────────────────

export interface AdminBreakdownItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AdminLeadTrendItem {
  period: string;
  totalLeads: number;
  newLeads: number;
  openLeads: number;
  customersWon: number;
  lostLeads: number;
}

export interface AdminSalesTrendItem {
  period: string;
  quotationValue: number;
  salesValue: number;
}

export interface AdminManagerPerformanceItem {
  id: string;
  managerName: string;
  assignedLeads: number;
  openLeads: number;
  prospects: number;
  quotationsSent: number;
  customersWon: number;
  conversionPercentage: number;
  quotationValue: number;
  salesValue: number;
}

export interface AdminExecutivePerformanceItem {
  id: string;
  executiveName: string;
  managerName: string | null;
  assignedLeads: number;
  openLeads: number;
  prospects: number;
  quotationsSent: number;
  customersWon: number;
  conversionPercentage: number;
  quotationValue: number;
  salesValue: number;
}

// ─── Admin — Main DTO ─────────────────────────────────────────────────────────

export interface AdminStatsDTO {
  kpis: {
    totalLeads: number;
    newLeadsToday: number;
    openLeads: number;
    prospects: number;
    quotationsSent: number;
    customersWon: number;
    lostLeads: number;
    conversionRate: number;
    quotationValue: number;
    salesValueWon: number;
    followUpsDueToday: number;
    overdueFollowUps: number;
  };
  leadSourceWise: {
    total: number;
    items: AdminBreakdownItem[];
  };
  leadStatusFunnel: {
    total: number;
    items: AdminBreakdownItem[];
  };
  leadTrend: {
    monthly: AdminLeadTrendItem[];
    weekly: AdminLeadTrendItem[];
  };
  salesTrend: {
    monthly: AdminSalesTrendItem[];
    weekly: AdminSalesTrendItem[];
  };
  managerPerformance: AdminManagerPerformanceItem[];
  executivePerformance: AdminExecutivePerformanceItem[];
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export interface ManagerBreakdownItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ManagerDailyFollowUpCompletionDTO {
  scheduled: number;
  completed: number;
  pending: number;
  overdue: number;
  completionPercentage: number;
}

export interface ManagerExecutivePerformanceItem {
  executiveId: string;
  executiveName: string;
  assignedLeads: number;
  openLeads: number;
  prospects: number;
  quotationsPending: number;
  quotationsApproved: number;
  customersConverted: number;
  conversionPercentage: number;
  scheduledFollowUps: number;
  completedFollowUps: number;
  followUpCompletionPercentage: number;
}

export interface ManagerStatsDTO {
  kpis: {
    leadsAssigned: number;
    leadsAssignedToTeam: number;
    openLeads: number;
    prospects: number;
    quotationsPending: number;
    quotationsApproved: number;
    customersConverted: number;
    teamConversionPercentage: number;
    followUpsDueToday: number;
    overdueFollowUps: number;
  };
  executivePerformance: ManagerExecutivePerformanceItem[];
  dailyFollowUpCompletion: ManagerDailyFollowUpCompletionDTO;
  leadStatusDistribution: {
    total: number;
    items: ManagerBreakdownItem[];
  };
  leadSourceWise: {
    total: number;
    items: ManagerBreakdownItem[];
  };
  leadStatusFunnel: {
    total: number;
    items: ManagerBreakdownItem[];
  };
}

// ─── Executive ───────────────────────────────────────────────────────────────

export interface ExecutiveBreakdownItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ExecutivePerformanceItem {
  period: string;
  leads: number;
  prospects: number;
  quotationsSent: number;
  customersWon: number;
  lostLeads: number;
  followUps: number;
}

export interface ExecutiveUpcomingFollowUp {
  id: string;
  prospectId: string;
  prospectNo: string;
  leadName: string;
  followUpDate: string;
  followUpTime: string | null;
  followUpType: string | null;
  notes: string | null;
}

export interface ExecutiveStatsDTO {
  myLeads: number;
  newLeads: number;
  openLeads: number;
  todaysFollowUps: number;
  overdueFollowUps: number;
  prospects: number;
  quotationsSent: number;
  customersWon: number;
  lostLeads: number;
  leadFunnel: {
    total: number;
    items: ExecutiveBreakdownItem[];
  };
  performance: {
    monthly: ExecutivePerformanceItem[];
    weekly: ExecutivePerformanceItem[];
  };
  leadSourceWise: {
    total: number;
    items: ExecutiveBreakdownItem[];
  };
  leadStatusFunnel: {
    total: number;
    items: ExecutiveBreakdownItem[];
  };
  upcomingFollowUps: ExecutiveUpcomingFollowUp[];
}
