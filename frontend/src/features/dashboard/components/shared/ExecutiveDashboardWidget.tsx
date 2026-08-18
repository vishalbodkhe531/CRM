import {
  CalendarClock,
  Clock3,
  ListChecks,
  PhoneCall,
  ScrollText,
  Trophy,
  UserRoundCheck,
  UserRoundPlus,
  UsersRound,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FunnelChart from "@/components/common/FunnelChart";
import {
  crmChartColors,
  dashboardKpiClass,
  dashboardPanelClass,
  dashboardTooltipStyle,
  dashboardTooltipTextStyle,
} from "@/components/common/uiTokens";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DashboardStats,
  ExecutiveDashboardStats,
} from "../../types";
import { sortFunnelItemsByCountDesc } from "../../utils/funnelSort";

const SOURCE_COLORS = [
  crmChartColors.lead[0],
  crmChartColors.lead[1],
  crmChartColors.lead[2],
  crmChartColors.quotation.PENDING,
  crmChartColors.status.neutral,
  crmChartColors.quotation.REJECTED,
];

const STATUS_COLORS: Record<string, string> = {
  NEW: crmChartColors.lead[0],
  ATTEMPTED_CONTACT: crmChartColors.lead[1],
  CONTACTED: crmChartColors.lead[2],
  QUALIFIED: crmChartColors.status.success,
  CONVERTED: "#0ea5e9",
  UNQUALIFIED: crmChartColors.status.error,
};

const PERFORMANCE_COLORS = {
  leads: crmChartColors.lead[0],
  prospects: crmChartColors.lead[2],
  quotationsSent: crmChartColors.quotation.PENDING,
  customersWon: crmChartColors.status.success,
  lostLeads: crmChartColors.status.error,
  followUps: "#2563eb",
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const formatTime = (time?: string | null) => {
  if (!time) return "No time";
  const [hoursValue, minutesValue = "00"] = time.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const displayLabel = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not set";

const KpiCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) => (
  <section className={`${dashboardKpiClass} min-h-24`}>
    <div className="flex items-center justify-between gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
        {icon}
      </span>
      <strong className="min-w-0 truncate text-2xl font-extrabold leading-none text-foreground">
        {formatNumber(value)}
      </strong>
    </div>
    <p className="mt-3 truncate text-xs font-semibold text-foreground">
      {title}
    </p>
  </section>
);

const PanelHeader = ({ title, href }: { title: string; href?: string }) => (
  <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
    <h2 className="truncate text-xs font-extrabold text-foreground">{title}</h2>
    {href ? (
      <Link
        className="shrink-0 text-xs font-extrabold text-primary hover:text-primary-hover"
        to={href}
      >
        View All
      </Link>
    ) : null}
  </div>
);

const EmptyRows = ({ label }: { label: string }) => (
  <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 text-center text-xs font-medium text-muted-foreground dark:border-border">
    {label}
  </div>
);

const DonutCenter = ({ value, label }: { value: number; label: string }) => (
  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
    <strong className="text-xl font-extrabold text-foreground">
      {formatNumber(value)}
    </strong>
    <span className="text-xs font-bold uppercase text-muted-foreground">
      {label}
    </span>
  </div>
);

const PerformanceChart = ({
  data,
}: {
  data: ExecutiveDashboardStats["performance"]["monthly"];
}) => {
  const hasData = data.some(
    (item) =>
      item.leads ||
      item.prospects ||
      item.quotationsSent ||
      item.customersWon ||
      item.lostLeads ||
      item.followUps,
  );

  if (!hasData) {
    return <EmptyRows label="No performance data for this period" />;
  }

  return (
    <div className="space-y-3">
      <div className="h-48">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="period"
              interval={0}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              width={34}
            />
            <Tooltip
              contentStyle={dashboardTooltipStyle}
              formatter={(value, name) => [formatNumber(Number(value)), name]}
              itemStyle={dashboardTooltipTextStyle}
              labelStyle={dashboardTooltipTextStyle}
            />
            <Bar
              dataKey="leads"
              fill={PERFORMANCE_COLORS.leads}
              name="Leads"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
            <Bar
              dataKey="prospects"
              fill={PERFORMANCE_COLORS.prospects}
              name="Prospects"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
            <Bar
              dataKey="quotationsSent"
              fill={PERFORMANCE_COLORS.quotationsSent}
              name="Quotations"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
            <Bar
              dataKey="customersWon"
              fill={PERFORMANCE_COLORS.customersWon}
              name="Won"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
            <Bar
              dataKey="lostLeads"
              fill={PERFORMANCE_COLORS.lostLeads}
              name="Lost"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
            <Bar
              dataKey="followUps"
              fill={PERFORMANCE_COLORS.followUps}
              name="Follow-ups"
              radius={[2, 2, 0, 0]}
              stackId="performance"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-foreground sm:grid-cols-3">
        {[
          ["Leads", PERFORMANCE_COLORS.leads],
          ["Prospects", PERFORMANCE_COLORS.prospects],
          ["Quotations", PERFORMANCE_COLORS.quotationsSent],
          ["Won", PERFORMANCE_COLORS.customersWon],
          ["Lost", PERFORMANCE_COLORS.lostLeads],
          ["Follow-ups", PERFORMANCE_COLORS.followUps],
        ].map(([label, color]) => (
          <span className="flex min-w-0 items-center gap-1.5" key={label}>
            <i
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const ExecutiveDashboardContent = ({
  stats,
}: {
  stats: ExecutiveDashboardStats;
}) => {

  const sourceData = stats.leadSourceWise.items.map((item, index) => ({
    ...item,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));

  const leadFunnelItems = sortFunnelItemsByCountDesc(
    stats.leadFunnel.items,
  ).map((item, index) => ({
    ...item,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));

  const statusFunnelItems = sortFunnelItemsByCountDesc(
    stats.leadStatusFunnel.items,
  ).map((item) => ({
    ...item,
    color: STATUS_COLORS[item.key] ?? crmChartColors.status.neutral,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<UserRoundCheck className="h-4 w-4" />}
          title="My Leads"
          value={stats.myLeads}
        />
        <KpiCard
          icon={<UserRoundPlus className="h-4 w-4" />}
          title="New Leads"
          value={stats.newLeads}
        />
        <KpiCard
          icon={<ListChecks className="h-4 w-4" />}
          title="Open Leads"
          value={stats.openLeads}
        />
        <KpiCard
          icon={<PhoneCall className="h-4 w-4" />}
          title="Today's Follow-ups"
          value={stats.todaysFollowUps}
        />
        <KpiCard
          icon={<Clock3 className="h-4 w-4" />}
          title="Overdue Follow-ups"
          value={stats.overdueFollowUps}
        />
        <KpiCard
          icon={<UsersRound className="h-4 w-4" />}
          title="Prospects"
          value={stats.prospects}
        />
        <KpiCard
          icon={<ScrollText className="h-4 w-4" />}
          title="Quotations Sent"
          value={stats.quotationsSent}
        />
        <KpiCard
          icon={<Trophy className="h-4 w-4" />}
          title="Customers Won"
          value={stats.customersWon}
        />
        <KpiCard
          icon={<XCircle className="h-4 w-4" />}
          title="Lost Leads"
          value={stats.lostLeads}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className={dashboardPanelClass}>
          <PanelHeader title="My Lead Funnel" />
          {stats.leadFunnel.total === 0 ? (
            <EmptyRows label="No assigned lead funnel data yet" />
          ) : (
            <FunnelChart
              className="py-1"
              items={leadFunnelItems.map((item) => ({
                label: item.label,
                value: item.count,
                color: item.color,
              }))}
              minBarPercent={14}
              valueLabel="records"
            />
          )}
        </section>

        <section className={dashboardPanelClass}>
          <PanelHeader title="Monthly/Weekly Performance" />
          <Tabs defaultValue="monthly">
            <TabsList className="mb-3 h-8 rounded-lg">
              <TabsTrigger className="h-6 rounded-md px-3 text-xs" value="monthly">
                Monthly
              </TabsTrigger>
              <TabsTrigger className="h-6 rounded-md px-3 text-xs" value="weekly">
                Weekly
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-0" value="monthly">
              <PerformanceChart data={stats.performance.monthly} />
            </TabsContent>
            <TabsContent className="mt-0" value="weekly">
              <PerformanceChart data={stats.performance.weekly} />
            </TabsContent>
          </Tabs>
        </section>

        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Source Wise" />
          {stats.leadSourceWise.total === 0 ? (
            <EmptyRows label="No lead source data yet" />
          ) : (
            <div className="grid min-h-44 grid-cols-1 items-center gap-4 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="relative h-40">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={sourceData}
                      dataKey="count"
                      innerRadius="54%"
                      nameKey="label"
                      outerRadius="78%"
                      stroke="none"
                    >
                      {sourceData.map((entry) => (
                        <Cell fill={entry.color} key={entry.key} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashboardTooltipStyle}
                      formatter={(value) => [`${value}`, "Leads"]}
                      itemStyle={dashboardTooltipTextStyle}
                      labelStyle={dashboardTooltipTextStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter label="Leads" value={stats.leadSourceWise.total} />
              </div>
              <div className="space-y-2">
                {sourceData.slice(0, 6).map((item) => (
                  <div
                    className="flex items-center gap-2 text-xs"
                    key={item.key}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatNumber(item.count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Status Funnel" />
          {stats.leadStatusFunnel.total === 0 ? (
            <EmptyRows label="No lead status data yet" />
          ) : (
            <FunnelChart
              className="py-1"
              items={statusFunnelItems.map((item) => ({
                label: item.label,
                value: item.count,
                color: item.color,
              }))}
              minBarPercent={16}
              valueLabel="leads"
            />
          )}
        </section>

        <section className={`${dashboardPanelClass} lg:col-span-2`}>
          <PanelHeader href={"/followups"} title="Upcoming Follow-ups" />
          {stats.upcomingFollowUps.length === 0 ? (
            <EmptyRows label="No upcoming follow-ups" />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {stats.upcomingFollowUps.map((followUp) => (
                <Link
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:bg-muted/35 dark:border-border dark:hover:bg-muted/50"
                  key={followUp.id}
                  to={`/prospects/${followUp.prospectId}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
                    {followUp.followUpType === "CALL" ? (
                      <PhoneCall className="h-4 w-4" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-extrabold text-foreground">
                      {followUp.leadName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {formatShortDate(followUp.followUpDate)} at{" "}
                      {formatTime(followUp.followUpTime)}
                    </span>
                  </span>
                  <span className="max-w-30 truncate text-right text-xs text-muted-foreground">
                    {followUp.notes || displayLabel(followUp.followUpType)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const ExecutiveDashboardWidget = ({
  stats,
}: {
  stats: DashboardStats;
}) => {
  if (!("leadFunnel" in stats)) return null;
  return <ExecutiveDashboardContent stats={stats} />;
};
