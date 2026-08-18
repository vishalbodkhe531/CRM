import { selectCurrentUser } from "@/features/auth";
import { useAppSelector } from '@/hooks/useRedux';
import { ROLE_FALLBACK_LABELS } from '../../constants/dashboard.constants';
import RoleDashboardWidget from '../shared/RoleDashboardWidget';
import { type UserRole } from "@/contracts/types";

const DashboardView = () => {
  const user = useAppSelector(selectCurrentUser);

  if (!user) {
    return null;
  }

  return <RoleDashboardWidget fallbackName={ROLE_FALLBACK_LABELS[user.role as UserRole]} />;
};

export default DashboardView;
