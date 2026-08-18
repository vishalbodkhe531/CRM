import { AlertCircle, CalendarClock, Users, UserX } from "lucide-react";
import type { PaginationMeta } from "@/types/api";
import type { Prospect } from "../../types";
import { StatCard } from "@/components/common/StatCard";

interface ProspectsStatsProps {
  prospects: Prospect[];
  meta?: PaginationMeta;
  isLoading?: boolean;
}

export default function ProspectsStats({
  prospects,
  meta,
  isLoading,
}: ProspectsStatsProps) {
  const stats = [
    {
      title: "Total Prospects",
      value: meta?.total ?? 0,
      icon: Users,
    },
    {
      title: "Lost Prospects",
      value: prospects.filter((p) => p.status === "LOST").length,
      icon: UserX,
    },
    {
      title: "Missed Follow-ups",
      value: meta?.missedFollowUps ?? 0,
      icon: AlertCircle,
    },
    {
      title: "Follow-ups Due Today",
      value: meta?.followUpsDueToday ?? 0,
      icon: CalendarClock,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={isLoading ? "..." : stat.value}
          icon={<stat.icon className="w-5 h-5" />}
        />
      ))}
    </div>
  );
}
