import { lazy, Suspense } from "react";
import { useAppSelector } from "@/hooks/useRedux";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useDashboardStats } from "../../hooks/useDashboard";
import { extractApiError } from "@/utils/apiError";
import type { UserRole } from "@/constants/roles";
import { ManagerDashboardSkeleton } from "./ManagerDashboardWidget";

const SuperAdminDashboardWidget = lazy(() =>
  import("./SuperAdminDashboardWidget").then((mod) => ({
    default: mod.SuperAdminDashboardWidget,
  })),
);
const AdminDashboardWidget = lazy(() =>
  import("./AdminDashboardWidget").then((mod) => ({
    default: mod.AdminDashboardWidget,
  })),
);
const ManagerDashboardWidget = lazy(() =>
  import("./ManagerDashboardWidget").then((mod) => ({
    default: mod.ManagerDashboardWidget,
  })),
);
const ExecutiveDashboardWidget = lazy(() =>
  import("./ExecutiveDashboardWidget").then((mod) => ({
    default: mod.ExecutiveDashboardWidget,
  })),
);

interface RoleDashboardWidgetProps {
  fallbackName: string;
}

const RoleDashboardWidget = ({ fallbackName: _fallbackName }: RoleDashboardWidgetProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const {
    data: stats,
    isLoading: loading,
    error: queryError,
  } = useDashboardStats(user?.role as UserRole);

  if (loading) {
    if (user?.role === "MANAGER") {
      return <ManagerDashboardSkeleton />;
    }

    return <LoadingState />;
  }

  if (queryError) {
    return (
      <ErrorState
        message={
          extractApiError(queryError).message || "Failed to load dashboard"
        }
      />
    );
  }

  const renderStats = () => {
    if (!stats || !user) return null;

    switch (user.role) {
      case "SUPER_ADMIN":
        return <SuperAdminDashboardWidget stats={stats} />;
      case "ADMIN":
        return <AdminDashboardWidget stats={stats} />;
      case "MANAGER":
        return <ManagerDashboardWidget stats={stats} />;
      case "EXECUTIVE":
        return <ExecutiveDashboardWidget stats={stats} />;
      default:
        return null;
    }
  };

  return (
    <Suspense fallback={user?.role === "MANAGER" ? <ManagerDashboardSkeleton /> : <LoadingState />}>
      <div className="space-y-3">{renderStats()}</div>
    </Suspense>
  );
};

export default RoleDashboardWidget;
