import {
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  ListChecks,
  ScrollText,
  Target,
  Trophy,
  XCircle
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
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
import type { AdminDashboardStats, DashboardStats } from "../../types";
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
  UNQUALIFIED: crmChartColors.status.error,
  CONVERTED: "#0ea5e9",
  NOT_SET: crmChartColors.status.neutral,
};

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) => (
  <section className={`${dashboardKpiClass} min-h-24`}>
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
        {icon}
      </span>
      <span className="ml-auto min-w-0 truncate text-2xl font-bold tracking-tight text-foreground">
        {value}
      </span>
    </div>
    <p className="mt-3 truncate text-sm font-medium text-muted-foreground">
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
    <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
    {action}
  </div>
);

const EmptyRows = ({ label }: { label: string }) => (
  <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 text-center text-sm text-muted-foreground dark:border-border">
    {label}
  </div>
);

const LeadTrendChart = ({
  data,
}: {
  data: AdminDashboardStats["leadTrend"]["monthly"];
}) => {
  const hasData = data.some(
    (item) =>
      item.totalLeads || item.openLeads || item.customersWon || item.lostLeads,
  );

  if (!hasData) return <EmptyRows label="No lead trend data yet" />;

  return (
    <div className="h-56">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="period"
            tick={{ fontSize: 10, fill: "#000000" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={[0, "dataMax"]}
            tick={{ fontSize: 11, fill: "#000000" }}
            tickMargin={8}
            tickLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={dashboardTooltipStyle}
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            itemStyle={dashboardTooltipTextStyle}
            labelStyle={dashboardTooltipTextStyle}
          />
          <Bar
            dataKey="totalLeads"
            fill={crmChartColors.lead[0]}
            name="Total Leads"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="openLeads"
            fill={crmChartColors.lead[2]}
            name="Open Leads"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="customersWon"
            fill={crmChartColors.status.success}
            name="Customers Won"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="lostLeads"
            fill={crmChartColors.status.error}
            name="Lost Leads"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SalesTrendChart = ({
  data,
}: {
  data: AdminDashboardStats["salesTrend"]["monthly"];
}) => {
  const hasData = data.some((item) => item.quotationValue || item.salesValue);

  if (!hasData) return <EmptyRows label="No sales trend data yet" />;

  return (
    <div className="h-56">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="period"
            tick={{ fontSize: 10, fill: "#000000" }}
            tickLine={false}
          />
          <YAxis axisLine={false} hide tickLine={false} />
          <Tooltip
            contentStyle={dashboardTooltipStyle}
            formatter={(value, name) => [formatCurrency(Number(value)), name]}
            itemStyle={dashboardTooltipTextStyle}
            labelStyle={dashboardTooltipTextStyle}
          />
          <Bar
            dataKey="quotationValue"
            fill={crmChartColors.quotation.PENDING}
            name="Quotation Value"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="salesValue"
            fill={crmChartColors.status.success}
            name="Sales Value"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const AdminDashboardContent = ({ stats }: { stats: AdminDashboardStats }) => {

  const sourceData = useMemo(
    () =>
      stats.leadSourceWise.items.map((item, index) => ({
        ...item,
        color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      })),
    [stats.leadSourceWise.items],
  );

  const statusFunnelItems = useMemo(
    () =>
      sortFunnelItemsByCountDesc(stats.leadStatusFunnel.items).map((item) => ({
        ...item,
        color: STATUS_COLORS[item.key] ?? crmChartColors.status.neutral,
      })),
    [stats.leadStatusFunnel.items],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            title="Total Leads"
            value={stats.kpis.totalLeads}
          />
          <KpiCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="New Leads (Today)"
            value={stats.kpis.newLeadsToday}
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
            icon={<ScrollText className="h-4 w-4" />}
            title="Quotations Sent"
            value={stats.kpis.quotationsSent}
          />
          <KpiCard
            icon={<Trophy className="h-4 w-4" />}
            title="Customers Won"
            value={stats.kpis.customersWon}
          />
          <KpiCard
            icon={<XCircle className="h-4 w-4" />}
            title="Lost Leads"
            value={stats.kpis.lostLeads}
          />
          <KpiCard
            icon={<Gauge className="h-4 w-4" />}
            title="Conversion Rate %"
            value={`${formatNumber(stats.kpis.conversionRate, 2)}%`}
          />
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            title="Quotation Value"
            value={formatCurrency(stats.kpis.quotationValue)}
          />
          <KpiCard
            icon={<CircleDollarSign className="h-4 w-4" />}
            title="Sales Value (Won)"
            value={formatCurrency(stats.kpis.salesValueWon)}
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
          <PanelHeader title="Lead Source Wise" />
          {stats.leadSourceWise.total === 0 ? (
            <EmptyRows label="No lead source data yet" />
          ) : (
            <div className="grid min-h-56 grid-cols-1 items-center gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1">
              <div className="relative h-44">
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
                    Leads
                  </span>
                </div>
              </div>
              <div className="space-y-2 self-center">
                {sourceData.slice(0, 7).map((item) => (
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

        <section className={dashboardPanelClass}>
          <PanelHeader title="Lead Status Funnel" />
          {stats.leadStatusFunnel.total === 0 ? (
            <EmptyRows label="No lead status funnel data yet" />
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

        <section className={dashboardPanelClass}>
          <PanelHeader title="Monthly/Weekly Lead Trend" />
          <Tabs defaultValue="monthly">
            <TabsList className="mb-3 h-8 rounded-lg">
              <TabsTrigger
                className="h-6 rounded-md px-3 text-xs"
                value="monthly"
              >
                Monthly
              </TabsTrigger>
              <TabsTrigger
                className="h-6 rounded-md px-3 text-xs"
                value="weekly"
              >
                Weekly
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-0" value="monthly">
              <LeadTrendChart data={stats.leadTrend.monthly} />
            </TabsContent>
            <TabsContent className="mt-0" value="weekly">
              <LeadTrendChart data={stats.leadTrend.weekly} />
            </TabsContent>
          </Tabs>
        </section>

        <section className={dashboardPanelClass}>
          <PanelHeader title="Monthly/Weekly Sales Trend" />
          <Tabs defaultValue="monthly">
            <TabsList className="mb-3 h-8 rounded-lg">
              <TabsTrigger
                className="h-6 rounded-md px-3 text-xs"
                value="monthly"
              >
                Monthly
              </TabsTrigger>
              <TabsTrigger
                className="h-6 rounded-md px-3 text-xs"
                value="weekly"
              >
                Weekly
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-0" value="monthly">
              <SalesTrendChart data={stats.salesTrend.monthly} />
            </TabsContent>
            <TabsContent className="mt-0" value="weekly">
              <SalesTrendChart data={stats.salesTrend.weekly} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
            title="Manager Performance"
          />
          {stats.managerPerformance.length === 0 ? (
            <EmptyRows label="No manager performance data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-xs font-bold uppercase text-muted-foreground">
                    <th className="border-b border-gray-100 px-3 py-2 dark:border-border">
                      Manager
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Leads
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Open
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Prospects
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Qtn
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Won
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Conv %
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.managerPerformance.map((row, index) => (
                    <tr className="text-xs" key={row.id}>
                      <td className="border-b border-gray-100 px-3 py-3 dark:border-border">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                              index % 2
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                                : "bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary"
                            }`}
                          >
                            {initials(row.managerName)}
                          </span>
                          <span className="min-w-0 truncate font-bold text-foreground">
                            {row.managerName}
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
                        {formatNumber(row.quotationsSent)}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                        {formatNumber(row.customersWon)}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-extrabold text-primary dark:border-border">
                        {row.conversionPercentage}%
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                        {formatCurrency(row.salesValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
            <EmptyRows label="No executive performance data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-xs font-bold uppercase text-muted-foreground">
                    <th className="border-b border-gray-100 px-3 py-2 dark:border-border">
                      Executive
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Leads
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Open
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Prospects
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Qtn
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Won
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Conv %
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-right dark:border-border">
                      Sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.executivePerformance.map((row, index) => (
                    <tr className="text-xs" key={row.id}>
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
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-foreground">
                              {row.executiveName}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {row.managerName ?? "No manager"}
                            </span>
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
                        {formatNumber(row.quotationsSent)}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                        {formatNumber(row.customersWon)}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-extrabold text-primary dark:border-border">
                        {row.conversionPercentage}%
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3 text-right font-semibold text-foreground dark:border-border">
                        {formatCurrency(row.salesValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const AdminDashboardWidget = ({ stats }: { stats: DashboardStats }) => {
  if (!("managerPerformance" in stats)) return null;
  return <AdminDashboardContent stats={stats} />;
};
