import { 
  SuperAdminStatsDTO, 
  AdminStatsDTO, 
  ManagerStatsDTO, 
  ExecutiveStatsDTO 
} from "@/contracts/dashboard";

/**
 * Dashboard Types - Re-exported from frontend-local contracts
 */

export type SuperAdminDashboardStats = SuperAdminStatsDTO;
export type AdminDashboardStats = AdminStatsDTO;
export type ManagerDashboardStats = ManagerStatsDTO;
export type ExecutiveDashboardStats = ExecutiveStatsDTO;

export type DashboardStats =
  | SuperAdminDashboardStats
  | AdminDashboardStats
  | ManagerDashboardStats
  | ExecutiveDashboardStats;
