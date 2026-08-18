import { ClipboardList, UserCheck, Users } from "lucide-react";
import { useUsers } from "../../hooks/useUsers";
import { StatCard } from "@/components/common/StatCard";
import { selectCurrentUser } from "@/features/auth";
import { useAppSelector } from "@/hooks/useRedux";

export default function UsersStats() {
  const currentUser = useAppSelector(selectCurrentUser);
  const isManager = currentUser?.role === "MANAGER";

  // Use the exact same pattern as LeadsStats for consistency
  const { data: allUsersData } = useUsers({ limit: 1, page: 1 });
  const { data: activeUsersData } = useUsers({ status: "ACTIVE", limit: 1, page: 1 });
  const { data: inactiveUsersData } = useUsers({ status: "INACTIVE", limit: 1, page: 1 });
  
  const { data: allExecutivesData } = useUsers({ role: "EXECUTIVE", limit: 1, page: 1 });
  const { data: activeExecutivesData } = useUsers({ role: "EXECUTIVE", status: "ACTIVE", limit: 1, page: 1 });
  const { data: inactiveExecutivesData } = useUsers({ role: "EXECUTIVE", status: "INACTIVE", limit: 1, page: 1 });
  
  const { data: managersData } = useUsers({ role: "MANAGER", limit: 1, page: 1 });

  const stats = isManager
    ? [
        {
          title: "Total Executives",
          value: allExecutivesData?.meta?.total ?? 0,
          icon: ClipboardList,
        },
        {
          title: "Active Executives",
          value: activeExecutivesData?.meta?.total ?? 0,
          icon: UserCheck,
        },
        {
          title: "Inactive Executives",
          value: inactiveExecutivesData?.meta?.total ?? 0,
          icon: ClipboardList,
        },
      ]
    : [
        {
          title: "Total Users",
          value: allUsersData?.meta?.total ?? 0,
          icon: Users,
        },
        {
          title: "Total Managers",
          value: managersData?.meta?.total ?? 0,
          icon: UserCheck,
        },
        {
          title: "Total Executives",
          value: allExecutivesData?.meta?.total ?? 0,
          icon: ClipboardList,
        },
      ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={<stat.icon className="w-5 h-5" />}
        />
      ))}
    </div>
  );
}
