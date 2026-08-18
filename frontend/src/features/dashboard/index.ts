// Dashboard Feature Barrel Exports

// Components
export { default as DashboardView } from "./components/view/DashboardView";
export { default as RoleDashboardWidget } from "./components/shared/RoleDashboardWidget";

// Constants
export * from "./constants/dashboard.constants";

// Hooks
export { useDashboardStats } from "./hooks/useDashboard";

// Types
export type {
  SuperAdminDashboardStats,
  AdminDashboardStats,
  ManagerDashboardStats,
  ExecutiveDashboardStats,
  DashboardStats,
} from "./types";
