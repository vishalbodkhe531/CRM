import { CheckCircle, XCircle, Users } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";

interface CustomersStatsProps {
  total?: number;
  active?: number;
  inactive?: number;
  isLoading?: boolean;
}

export default function CustomersStats({
  total = 0,
  active = 0,
  inactive = 0,
  isLoading = false,
}: CustomersStatsProps) {
  const stats = [
    {
      title: "Total Customers",
      value: total,
      icon: Users,
    },
    {
      title: "Active Customers",
      value: active,
      icon: CheckCircle,
    },
    {
      title: "Inactive Customers",
      value: inactive,
      icon: XCircle,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
