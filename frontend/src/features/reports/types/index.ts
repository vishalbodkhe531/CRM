import type { PaginationMeta } from "@/types/api";

export interface ReportFilters {
  range: "All Time" | "Today" | "This Week" | "This Month" | "Custom";
  from?: string;
  to?: string;
  executiveId?: string;
  source?: string;
  status?: string;
}

export interface SummaryStats {
  totalLeads: number;
  totalProspects: number;
  totalQuotations: number;
  totalRevenue: number;
  conversionRate: number;
}

export interface LeadReportsResponse {
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
  byExecutive: {
    executiveId: string;
    executiveName: string;
    totalAssigned: number;
    active: number;
    converted: number;
    lost: number;
  }[];
  records: {
    id: string;
    leadNo: string;
    name: string;
    companyName: string;
    email: string;
    mobile: string;
    source: string;
    status: string;
    executiveName: string;
    createdAt: string;
  }[];
  meta: PaginationMeta;
}

export interface ProspectReportsResponse {
  stageDistribution: { stage: string; count: number }[];
  conversionRate: {
    leadToProspectRate: number;
    prospectToCustomerRate: number;
    totalLeads: number;
    convertedLeads: number;
    totalProspects: number;
    wonProspects: number;
  };
  records: {
    id: string;
    prospectNo: string;
    leadNo: string;
    name: string;
    companyName: string;
    stage: string;
    expectedValue: number;
    closeDate: string;
    executiveName: string;
    createdAt: string;
  }[];
  meta: PaginationMeta;
}

export interface QuotationReportsResponse {
  byStatus: { status: string; count: number }[];
  revenue: {
    totalRevenue: number;
    approvedValue: number;
    pendingValue: number;
  };
  monthlyTrend: {
    month: string;
    approved: number;
    pending: number;
  }[];
  records: {
    id: string;
    quotationNo: string;
    partyName: string;
    refNo: string;
    date: string;
    status: string;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    executiveName: string;
  }[];
  meta: PaginationMeta;
}

export interface PerformanceReportsResponse {
  executivePerformance: {
    executiveId: string;
    executiveName: string;
    assignedLeads: number;
    convertedLeads: number;
    conversionPercentage: number;
    scheduledFollowUps: number;
    completedFollowUps: number;
    pendingFollowUps: number;
    followUpCompletionRate: number;
  }[];
}

export interface ReportsResponse {
  summaryStats: SummaryStats;
  leadReports: LeadReportsResponse;
  prospectReports: ProspectReportsResponse;
  quotationReports: QuotationReportsResponse;
  performanceReports: PerformanceReportsResponse;
}
