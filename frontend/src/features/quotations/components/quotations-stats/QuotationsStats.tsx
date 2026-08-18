import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";

interface QuotationsStatsProps {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const STATS_CONFIG = [
  {
    key: "total" as const,
    title: "Total Quotations",
    icon: FileText,
  },
  {
    key: "pending" as const,
    title: "Pending Quotations",
    icon: Clock,
  },
  {
    key: "approved" as const,
    title: "Approved Quotations",
    icon: CheckCircle,
  },
  {
    key: "rejected" as const,
    title: "Rejected Quotations",
    icon: XCircle,
  },
];

export default function QuotationsStats({
  total,
  pending,
  approved,
  rejected,
}: QuotationsStatsProps) {
  const values = { total, pending, approved, rejected };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATS_CONFIG.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={values[stat.key]}
          icon={<stat.icon className="w-5 h-5" />}
        />
      ))}   
    </div>
  );
}
