import type { SafeUser } from "../../types/user.types";
import { reportsRepository } from "./reports.repository";

export const reportsService = {
  getReportsData: async (user: SafeUser, organizationId: string, query: any) => {
    const [
      summaryStats,
      leadReports,
      prospectReports,
      quotationReports,
      performanceReports,
    ] = await Promise.all([
      reportsRepository.getSummaryStats(user, organizationId, query),
      reportsRepository.getLeadReports(user, organizationId, query),
      reportsRepository.getProspectReports(user, organizationId, query),
      reportsRepository.getQuotationReports(user, organizationId, query),
      reportsRepository.getPerformanceReports(user, organizationId, query),
    ]);

    return {
      summaryStats,
      leadReports,
      prospectReports,
      quotationReports,
      performanceReports,
    };
  },
  getReportSection: async (user: SafeUser, organizationId: string, section: string, query: any) => {
    switch (section) {
      case "summary":
        return { summaryStats: await reportsRepository.getSummaryStats(user, organizationId, query) };
      case "leads":
        return { leadReports: await reportsRepository.getLeadReports(user, organizationId, query) };
      case "prospects":
        return { prospectReports: await reportsRepository.getProspectReports(user, organizationId, query) };
      case "quotations":
        return { quotationReports: await reportsRepository.getQuotationReports(user, organizationId, query) };
      case "performance":
        return { performanceReports: await reportsRepository.getPerformanceReports(user, organizationId, query) };
      default:
        return {};
    }
  },

  exportCSV: async (user: SafeUser, organizationId: string, type: string, query: any) => {
    return reportsRepository.exportCSV(user, organizationId, type, query);
  },
};
