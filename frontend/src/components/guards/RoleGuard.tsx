import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import GuardLoading from "@/components/guards/GuardLoading";
import type { UserRole } from "@/constants/roles";
import { useAppSelector } from "@/hooks/useRedux";
import { DEFAULT_AUTHENTICATED_PATH } from "@/utils/orgRoutes";

interface RoleGuardProps {
  roles: readonly UserRole[];
  children: ReactNode;
}

const RoleGuard = ({ roles, children }: RoleGuardProps) => {
  const { user, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return <GuardLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!roles.includes(user.role as UserRole)) {
    return <Navigate to={DEFAULT_AUTHENTICATED_PATH} replace />;
  }
  return <>{children}</>;
};

export default RoleGuard;
