import { CheckCircle, PhoneCall, Users } from "lucide-react";
import { useLeads } from "../../hooks/useLeads";
import { StatCard } from "@/components/common/StatCard";

export default function LeadsStats() {
  // Fetch total count of all leads (meta.total is accurate regardless of pagination)
  const { data: allData } = useLeads({ limit: 1, page: 1 });
  // Fetch count of qualified leads only
  const { data: qualifiedData } = useLeads({ status: "QUALIFIED", limit: 1, page: 1 });
  // Fetch count of unqualified leads only
  const { data: unqualifiedData } = useLeads({ status: "UNQUALIFIED", limit: 1, page: 1 });

  const stats = [
    {
      title: "Total Leads",
      value: allData?.meta?.total ?? 0,
      icon: Users,
    },
    {
      title: "Qualified Leads",
      value: qualifiedData?.meta?.total ?? 0,
      icon: CheckCircle,
    },
    {
      title: "Unqualified Leads",
      value: unqualifiedData?.meta?.total ?? 0,
      icon: PhoneCall,
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
