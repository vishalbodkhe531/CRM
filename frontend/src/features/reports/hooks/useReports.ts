import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { reportsService } from "../api/services";
import { useAppSelector } from "@/hooks/useRedux";
import type { ReportFilters } from "../types";

export const useReportsSummary = (filters: ReportFilters) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;
  return useQuery({
    queryKey: [...queryKeys.quotations.all, "reports", "summary", filters, selectedOrgId],
    queryFn: () => reportsService.getSummary(filters),
    enabled: isEnabled,
  });
};

export const useLeadReports = (filters: ReportFilters & { page: number; limit: number }) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;
  return useQuery({
    queryKey: [...queryKeys.leads.all, "reports", "leads", filters, selectedOrgId],
    queryFn: () => reportsService.getLeads(filters),
    enabled: isEnabled,
  });
};

export const useProspectReports = (filters: ReportFilters & { page: number; limit: number }) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;
  return useQuery({
    queryKey: [...queryKeys.prospects.all, "reports", "prospects", filters, selectedOrgId],
    queryFn: () => reportsService.getProspects(filters),
    enabled: isEnabled,
  });
};

export const useQuotationReports = (filters: ReportFilters & { page: number; limit: number }) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;
  return useQuery({
    queryKey: [...queryKeys.quotations.all, "reports", "quotations", filters, selectedOrgId],
    queryFn: () => reportsService.getQuotations(filters),
    enabled: isEnabled,
  });
};

export const usePerformanceReports = (filters: ReportFilters) => {
  const selectedOrgId = useAppSelector((state) => state.auth.selectedOrganizationId);
  const user = useAppSelector((state) => state.auth.user);
  const isEnabled = user ? (user.role === "SUPER_ADMIN" ? !!selectedOrgId : true) : false;
  return useQuery({
    queryKey: [...queryKeys.users.all, "reports", "performance", filters, selectedOrgId],
    queryFn: () => reportsService.getPerformance(filters),
    enabled: isEnabled,
  });
};
