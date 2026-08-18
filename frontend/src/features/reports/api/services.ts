import api from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import { REPORTS_ENDPOINTS } from "./endpoints";
import type {
  LeadReportsResponse,
  ProspectReportsResponse,
  QuotationReportsResponse,
  ReportFilters,
  ReportsResponse,
} from "../types";

type PaginatedReportFilters = ReportFilters & { page?: number; limit?: number };

export const reportsService = {
  getReports: async (filters: PaginatedReportFilters) => {
    const res = await api.get<ApiResponse<ReportsResponse>>(REPORTS_ENDPOINTS.ROOT, {
      params: filters,
    });
    return res.data.data!;
  },

  getSummary: async (filters: ReportFilters) => {
    const data = await reportsService.getReports(filters);
    return data.summaryStats;
  },

  getLeads: async (filters: PaginatedReportFilters): Promise<LeadReportsResponse> => {
    const data = await reportsService.getReports(filters);
    return data.leadReports;
  },

  getProspects: async (filters: PaginatedReportFilters): Promise<ProspectReportsResponse> => {
    const data = await reportsService.getReports(filters);
    return data.prospectReports;
  },

  getQuotations: async (filters: PaginatedReportFilters): Promise<QuotationReportsResponse> => {
    const data = await reportsService.getReports(filters);
    return data.quotationReports;
  },

  getPerformance: async (filters: ReportFilters) => {
    const data = await reportsService.getReports(filters);
    return data.performanceReports;
  },

  exportCSV: async (type: string, filters: ReportFilters) => {
    const res = await api.get(REPORTS_ENDPOINTS.ROOT, {
      params: { exportType: type, ...filters },
      responseType: "blob",
    });
    return res.data;
  },
};
