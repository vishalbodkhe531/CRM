import { Boxes, CheckCircle, Package, Wrench } from "lucide-react";
import { useItemStats } from "../../hooks/useItems";
import { StatCard } from "@/components/common/StatCard";

export default function ItemsStats() {
  const { data, isLoading } = useItemStats();

  const stats = [
    {
      title: "Total Items",
      value: data?.total ?? 0,
      icon: Package,
    },
    {
      title: "Active Items",
      value: data?.active ?? 0,
      icon: CheckCircle,
    },
    {
      title: "Goods",
      value: data?.goods ?? 0,
      icon: Boxes,
    },
    {
      title: "Services",
      value: data?.services ?? 0,
      icon: Wrench,
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
