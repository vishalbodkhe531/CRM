import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  Percent,
  Target,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import FunnelChart from "@/components/common/FunnelChart";
import {
  crmChartColors,
  dashboardKpiClass,
  dashboardPanelClass,
  dashboardSoftPanelClass,
  dashboardTooltipStyle,
  dashboardTooltipTextStyle,
} from "@/components/common/uiTokens";
import type { DashboardStats, ManagerDashboardStats } from "../../types";
import { sortFunnelItemsByCountDesc } from "../../utils/funnelSort";

const STATUS_COLORS: Record<string, string> = {
  NEW: crmChartColors.lead[0],
  ATTEMPTED_CONTACT: crmChartColors.lead[1],
  CONTACTED: crmChartColors.lead[2],
  QUALIFIED: crmChartColors.status.success,
  UNQUALIFIED: crmChartColors.status.error,
  CONVERTED: "#0ea5e9",
  NOT_SET: crmChartColors.status.neutral,
};

const SOURCE_COLORS = [
  crmChartColors.lead[0],
  crmChartColors.lead[1],
  crmChartColors.lead[2],
  crmChartColors.quotation.PENDING,
  crmChartColors.status.neutral,
  crmChartColors.quotation.REJECTED,
];

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const KpiCard = ({
  title,
  value,
  icon,
  suffix = "",
}: {
  title: string;
  value: number;
  icon: ReactNode;
  suffix?: string;
}) => (
  <section className={`${dashboardKpiClass} min-h-24`}>
    <div className="flex items-center justify-between gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
        {icon}
      </span>
      <strong className="min-w-0 truncate text-2xl font-extrabold text-foreground">
        {formatNumber(value, suffix ? 2 : 0)}
        {suffix}
      </strong>
    </div>
    <p className="mt-3 truncate text-xs font-semibold text-foreground">
      {title}
    </p>
  </section>
);

const PanelHeader = ({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) => (
  <div className="mb-4 flex min-h-7 items-center justify-between gap-3">
    <h2 className="truncate text-sm font-bold text-foreground">{title}</h2>
    {action}
  </div>
);

const EmptyBlock = ({ label }: { label: string }) => (
  <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 text-center text-sm text-muted-foreground dark:border-border">
    {label}
  </div>
);

const MiniStat = ({
  tone,
  label,
  value,
}: {
  tone: string;
  label: string;
  value: string;
}) => (
  <div className={dashboardSoftPanelClass}>
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
        <span className="truncate text-xs font-bold uppercase text-muted-foreground">
          {label}:
        </span>
      </div>
      <p className="text-sm font-extrabold text-foreground">{value}</p>
    </div>
  </div>
);

const ManagerDashboardContent = ({
  stats,
}: {
  stats: ManagerDashboardStats;
}) => {

  const statusDistributionData = stats.leadStatusDistribution.items.map(
    (item) => ({
      ...item,
      color: STATUS_COLORS[item.key] ?? crmChartColors.status.neutral,
    }),
  );
  const hasStatusDistribution = stats.leadStatusDistribution.total > 0;

  const sourceData = stats.leadSourceWise.items.map((item, index) => ({
    ...item,
    color: SOURCE_COLORS[index % SOURCE_COLORS.length],
  }));
  const hasSourceData = stats.leadSourceWise.total > 0;

  const statusFunnelItems = sortFunnelItemsByCountDesc(
    stats.leadStatusFunnel.items,
  ).map((item) => ({
    ...item,
    color: STATUS_COLORS[item.key] ?? crmChartColors.status.neutral,
  }));
  const hasStatusFunnel = stats.leadStatusFunnel.total > 0;

  const dailyFollowUpData = [
    {
      name: "Completed",
      value: stats.dailyFollowUpCompletion.completed,
      color: crmChartColors.status.success,
    },
    {
      name: "Pending",
      value: stats.dailyFollowUpCompletion.pending,
      color: crmChartColors.status.warning,
    },
  ];
  const hasDailyFollowUps = stats.dailyFollowUpCompletion.scheduled > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            icon={<UserRoundCheck className="h-4 w-4" />}
            title="Leads Assigned"
            value={stats.kpis.leadsAssigned}
          />
          <KpiCard
            icon={<UsersRound className="h-4 w-4" />}
            title="Leads Assigned to Team"
            value={stats.kpis.leadsAssignedToTeam}
          />
          <KpiCard
            icon={<ListChecks className="h-4 w-4" />}
            title="Open Leads"
            value={stats.kpis.openLeads}
          />
          <KpiCard
            icon={<Target className="h-4 w-4" />}
            title="Prospects"
            value={stats.kpis.prospects}
          />
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            title="Quotations Pending"
            value={stats.kpis.quotationsPending}
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Quotations Approved"
            value={stats.kpis.quotationsApproved}
          />
          <KpiCard
            icon={<Trophy className="h-4 w-4" />}
            title="Customers Converted"
            value={stats.kpis.customersConverted}
          />
          <KpiCard
            icon={<Percent className="h-4 w-4" />}
            suffix="%"
            title="Team Conversion %"
            value={stats.kpis.teamConversionPercentage}
          />
          <KpiCard
            icon={<CalendarClock className="h-4 w-4" />}
            title="Follow-ups Due Today"
            value={stats.kpis.followUpsDueToday}
          />
          <KpiCard
            icon={<Clock3 className="h-4 w-4" />}
            title="Overdue Follow-ups"
            value={stats.kpis.overdueFollowUps}
          />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Status Distribution" />
          {!hasStatusDistribution ? (
            <EmptyBlock label="No lead status data yet" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1">
              <div className="relative h-40">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={statusDistributionData}
                      dataKey="count"
                      innerRadius="62%"
                      nameKey="label"
                      outerRadius="82%"
                      stroke="none"
                    >
                      {statusDistributionData.map((entry) => (
                        <Cell fill={entry.color} key={entry.key} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashboardTooltipStyle}
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        "Leads",
                      ]}
                      itemStyle={dashboardTooltipTextStyle}
                      labelStyle={dashboardTooltipTextStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-3xl font-extrabold text-foreground">
                    {formatNumber(stats.leadStatusDistribution.total)}
                  </strong>
                  <span className="text-xs font-bold text-muted-foreground">
                    Leads
                  </span>
                </div>
              </div>
              <div className="space-y-3 self-center">
                {statusDistributionData.map((item) => (
                  <div className="space-y-1.5" key={item.key}>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-bold text-foreground">
                        {formatNumber(item.count)}
                      </span>
                      <span className="w-10 text-right font-semibold text-muted-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={dashboardPanelClass}>
          <PanelHeader title="Daily Follow-up Completion" />
          {!hasDailyFollowUps ? (
            <EmptyBlock label="No follow-ups scheduled today" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1">
              <div className="relative h-40">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      data={dailyFollowUpData}
                      dataKey="value"
                      innerRadius="66%"
                      nameKey="name"
                      outerRadius="84%"
                      stroke="none"
                    >
                      {dailyFollowUpData.map((entry) => (
                        <Cell fill={entry.color} key={entry.name} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashboardTooltipStyle}
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        "Follow-ups",
                      ]}
                      itemStyle={dashboardTooltipTextStyle}
                      labelStyle={dashboardTooltipTextStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-xl font-extrabold text-foreground">
                    {stats.dailyFollowUpCompletion.completionPercentage}%
                  </strong>
                  <span className="text-xs font-bold text-primary">
                    Complete
                  </span>
                </div>
              </div>
              <div className="grid content-center gap-1">
                <MiniStat
                  label="Scheduled"
                  tone="bg-sky-500"
                  value={formatNumber(stats.dailyFollowUpCompletion.scheduled)}
                />
                <MiniStat
                  label="Completed"
                  tone="bg-primary"
                  value={formatNumber(stats.dailyFollowUpCompletion.completed)}
                />
                <MiniStat
                  label="Pending"
                  tone="bg-amber-500"
                  value={formatNumber(stats.dailyFollowUpCompletion.pending)}
                />
                <MiniStat
                  label="Overdue"
                  tone="bg-rose-500"
                  value={formatNumber(stats.dailyFollowUpCompletion.overdue)}
                />
              </div>
            </div>
          )}
        </section>

        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Source Wise" />
          {!hasSourceData ? (
            <EmptyBlock label="No lead source data yet" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1">
              <div className="relative h-40">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={sourceData}
                      dataKey="count"
                      innerRadius="58%"
                      nameKey="label"
                      outerRadius="80%"
                      stroke="none"
                    >
                      {sourceData.map((entry) => (
                        <Cell fill={entry.color} key={entry.key} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashboardTooltipStyle}
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        "Leads",
                      ]}
                      itemStyle={dashboardTooltipTextStyle}
                      labelStyle={dashboardTooltipTextStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-2xl font-extrabold text-foreground">
                    {formatNumber(stats.leadSourceWise.total)}
                  </strong>
                  <span className="text-xs font-bold text-muted-foreground">
                    Sources
                  </span>
                </div>
              </div>
              <div className="space-y-2 self-center">
                {sourceData.slice(0, 6).map((item) => (
                  <div className="flex items-center gap-2 text-xs" key={item.key}>
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

        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Status Funnel" />
          {!hasStatusFunnel ? (
            <EmptyBlock label="No lead funnel data yet" />
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
      </div>

      <section className={dashboardPanelClass}>
        <PanelHeader
          action={
            <Link
              className="text-xs font-bold text-primary hover:text-primary-hover dark:text-primary"
              to={"/reports"}
            >
              View Full Report
            </Link>
          }
          title="Executive Performance"
        />
        {stats.executivePerformance.length === 0 ? (
          <EmptyBlock label="No executive performance data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs font-bold uppercase text-muted-foreground">
                  <th className="border-b border-gray-100 px-3 py-2 dark:border-border">
                    Executive
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Assigned
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Open
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Prospects
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Pending Qtn
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Approved Qtn
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Customers
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    Conv %
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    FU Done
                  </th>
                  <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                    FU %
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.executivePerformance.map((row, index) => (
                  <tr className="text-xs" key={row.executiveId}>
                    <td className="border-b border-gray-100 px-3 py-3 dark:border-border">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                            index % 3 === 1
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200"
                              : index % 3 === 2
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                                : "bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary"
                          }`}
                        >
                          {initials(row.executiveName)}
                        </span>
                        <span
                          className="min-w-0 truncate font-bold text-foreground"
                          title={row.executiveName}
                        >
                          {row.executiveName}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.assignedLeads)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.openLeads)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.prospects)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.quotationsPending)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.quotationsApproved)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                      {formatNumber(row.customersConverted)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-extrabold text-primary dark:border-border">
                      {row.conversionPercentage}%
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-extrabold text-primary dark:border-border">
                      {formatNumber(row.completedFollowUps)}/
                      {formatNumber(row.scheduledFollowUps)}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-3 text-right font-extrabold text-primary dark:border-border">
                      {row.followUpCompletionPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export const ManagerDashboardWidget = ({
  stats,
}: {
  stats: DashboardStats;
}) => {
  if (!("kpis" in stats) || !("leadStatusDistribution" in stats)) return null;
  return <ManagerDashboardContent stats={stats} />;
};

export const ManagerDashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            className="h-24 min-w-0 animate-pulse rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-border dark:bg-card"
            key={index}
          >
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-full bg-gray-100 dark:bg-muted" />
              <span className="h-7 w-14 rounded bg-gray-100 dark:bg-muted" />
            </div>
            <div className="mt-4 h-3 w-24 rounded bg-gray-100 dark:bg-muted" />
          </div>
        ))}
    </div>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-64 animate-pulse rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-border dark:bg-card"
          key={index}
        >
          <div className="h-4 w-32 rounded bg-gray-100 dark:bg-muted" />
          <div className="mt-8 h-36 rounded-xl bg-gray-100 dark:bg-muted" />
        </div>
      ))}
    </div>
    <div className="h-64 animate-pulse rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-border dark:bg-card" />
  </div>
);
