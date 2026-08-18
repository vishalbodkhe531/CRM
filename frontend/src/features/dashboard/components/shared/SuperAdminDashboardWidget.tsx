import {
  Building2,
  Download,
  FileText,
  IndianRupee,
  TrendingUp,
  UserRoundCog,
  Users
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatusBadge from "@/components/common/StatusBadge";
import {
  chartSeriesColor,
  dashboardKpiClass,
  dashboardPanelClass,
  dashboardTooltipStyle,
  dashboardTooltipTextStyle,
} from "@/components/common/uiTokens";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardStats, SuperAdminDashboardStats } from "../../types";

/**
 * Synthetic id for the pooled "Other" bar. Not an organization id — it exists
 * only to key the row and to colour it differently from a real tenant.
 */
const OTHER_ROW_ID = "__other__";

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);

const formatCompactCurrency = (value: number) => {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_00_00_000) {
    return `Rs. ${formatNumber(value / 1_00_00_000, 1)}Cr`;
  }

  if (absoluteValue >= 1_00_000) {
    return `Rs. ${formatNumber(value / 1_00_000, 1)}L`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
}) => (
  <section className={`${dashboardKpiClass} flex min-h-23 flex-col justify-between rounded-[14px] px-3 py-3`}>
    <div className="flex items-start justify-between gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
        {icon}
      </span>
      <strong className="min-w-0 truncate text-right text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
        {value}
      </strong>
    </div>
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-muted-foreground">
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground/80">
          {subtitle}
        </p>
      ) : null}
    </div>
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
    <h2 className="truncate text-sm font-extrabold text-foreground">{title}</h2>
    {action}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
    {label}
  </div>
);

const OrgLeadDistribution = ({
  stats,
}: {
  stats: SuperAdminDashboardStats;
}) => {
  const distribution = stats.organizationLeadDistribution;

  /**
   * The tail arrives pre-aggregated as `otherOrganizations`: the server sends
   * only the charted rows, so the remainder cannot be summed here. Without this
   * row the bars silently omitted every organization past the top few, and a
   * platform with 50 tenants looked like it had six.
   */
  const other = stats.otherOrganizations;

  const rows = [
    ...distribution,
    ...(other
      ? [
          {
            organizationId: OTHER_ROW_ID,
            organizationName: `Other (${formatNumber(other.organizationCount)} organizations)`,
            leadCount: other.leadCount,
            percentage: other.percentage,
          },
        ]
      : []),
  ];

  const maxLeadCount = Math.max(
    1,
    ...rows.map((organization) => organization.leadCount),
  );

  if (rows.length === 0) {
    return <EmptyState label="No organization lead data yet" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((organization) => {
        const width = `${Math.max(4, (organization.leadCount / maxLeadCount) * 100)}%`;

        return (
          <div className="space-y-1.5" key={organization.organizationId}>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="min-w-0 truncate font-semibold text-foreground">
                {organization.organizationName}
              </span>
              <span className="shrink-0 font-semibold text-muted-foreground">
                {formatNumber(organization.leadCount)} leads
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full"
              style={{ backgroundColor: chartSeriesColor.track }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width,
                  backgroundColor:
                    organization.organizationId === OTHER_ROW_ID
                      ? chartSeriesColor.statusArchived
                      : chartSeriesColor.primary,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeadTrendChart = ({
  data,
}: {
  data: SuperAdminDashboardStats["leadTrend"]["monthly"];
}) => {
  const hasData = data.some((item) => item.totalLeads || item.conversions);

  if (!hasData) return <EmptyState label="No trend data yet" />;

  return (
    <div className="h-53.5">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            axisLine={false}
            dataKey="period"
            tick={{ fontSize: 10, fill: "rgb(var(--muted-foreground))" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "rgb(var(--muted-foreground))" }}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={dashboardTooltipStyle}
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            itemStyle={dashboardTooltipTextStyle}
            labelStyle={dashboardTooltipTextStyle}
          />
          <Legend
            align="right"
            iconType="circle"
            verticalAlign="top"
            wrapperStyle={{ fontSize: 10, paddingBottom: 12 }}
          />
          <Line
            activeDot={{ r: 4 }}
            dataKey="totalLeads"
            dot={false}
            name="New Leads"
            stroke={chartSeriesColor.secondary}
            strokeWidth={3}
            type="monotone"
          />
          <Line
            activeDot={{ r: 4 }}
            dataKey="conversions"
            dot={false}
            name="Conversions"
            stroke={chartSeriesColor.primary}
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RecentOrganizationsTable = ({
  organizations,
}: {
  organizations: SuperAdminDashboardStats["recentOrganizations"];
}) => {
  if (organizations.length === 0) {
    return <EmptyState label="No organizations have been created yet" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-180 border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[10px] font-bold text-muted-foreground">
            <th className="border-b border-border px-3 py-2">Org Name</th>
            <th className="border-b border-border px-3 py-2">Prefix</th>
            <th className="border-b border-border px-3 py-2 text-right">Users</th>
            <th className="border-b border-border px-3 py-2 text-right">Leads</th>
            <th className="border-b border-border px-3 py-2 text-center">Status</th>
            <th className="border-b border-border px-3 py-2">Created Date</th>
            {organizations.some((organization) => organization.exportReportUrl) ? (
              <th className="border-b border-border px-3 py-2 text-right">
                Report
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {organizations.map((organization) => (
            <tr className="text-xs" key={organization.id}>
              <td className="border-b border-border px-3 py-3">
                <Link
                  className="font-extrabold text-foreground hover:text-primary-hover dark:hover:text-primary"
                  to={`/platform/organizations/${organization.slug}`}
                >
                  {organization.name}
                </Link>
              </td>
              <td className="border-b border-border px-3 py-3 font-semibold text-muted-foreground">
                {organization.prefix}
              </td>
              <td className="border-b border-border px-3 py-3 text-right font-semibold text-foreground">
                {formatNumber(organization.users)}
              </td>
              <td className="border-b border-border px-3 py-3 text-right font-semibold text-foreground">
                {formatNumber(organization.leads)}
              </td>
              <td className="border-b border-border px-3 py-3 text-center">
                <StatusBadge
                  className="px-2 py-0 text-[9px]"
                  status={organization.status}
                  type={organization.status === "ACTIVE" ? "success" : "inactive"}
                />
              </td>
              <td className="border-b border-border px-3 py-3 font-medium text-muted-foreground">
                {formatDate(organization.createdDate)}
              </td>
              {organizations.some((item) => item.exportReportUrl) ? (
                <td className="border-b border-border px-3 py-3 text-right">
                  {organization.exportReportUrl ? (
                    <Button asChild className="h-7 px-2 text-[10px]" size="sm">
                      <a href={organization.exportReportUrl}>
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </a>
                    </Button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OrganizationStatusChart = ({
  stats,
}: {
  stats: SuperAdminDashboardStats["organizationStatus"];
}) => {
  /**
   * Archived is deliberately outside the donut. The donut totals live tenants,
   * and archiving forces status to SUSPENDED — so including archived orgs here
   * would count them twice and disagree with the Organizations list.
   */
  const data = [
    { name: "Active", value: stats.active, color: chartSeriesColor.statusActive },
    {
      name: "Suspended",
      value: stats.suspended,
      color: chartSeriesColor.primary,
    },
  ];

  return (
    <div className="flex min-h-67 flex-col items-center justify-between gap-5 overflow-hidden">
      <div className="relative mx-auto h-44 w-full max-w-56 shrink-0">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={0}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell fill={entry.color} key={entry.name} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={dashboardTooltipStyle}
              formatter={(value) => [formatNumber(Number(value)), "Organizations"]}
              itemStyle={dashboardTooltipTextStyle}
              labelStyle={dashboardTooltipTextStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-[28px] font-extrabold leading-none text-foreground">
            {formatNumber(stats.total)}
          </strong>
          <span className="mt-1 text-[9px] font-bold uppercase text-muted-foreground">
            Organizations
          </span>
        </div>
      </div>
      <div className="grid w-full shrink-0 grid-cols-3 gap-2">
        <div className="flex h-16 min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/45 px-2 text-center shadow-sm">
          <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
            Active
          </p>
          <p className="mt-1 truncate text-xl font-extrabold leading-none text-primary dark:text-primary">
            {formatNumber(stats.active)}
          </p>
        </div>
        <div className="flex h-16 min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/45 px-2 text-center shadow-sm">
          <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
            Suspended
          </p>
          <p
            className="mt-1 truncate text-xl font-extrabold leading-none"
            style={{ color: chartSeriesColor.primary }}
          >
            {formatNumber(stats.suspended)}
          </p>
        </div>
        <div className="flex h-16 min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/45 px-2 text-center shadow-sm">
          <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
            Archived
          </p>
          <p className="mt-1 truncate text-xl font-extrabold leading-none text-muted-foreground">
            {formatNumber(stats.archived)}
          </p>
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboardContent = ({
  stats,
}: {
  stats: SuperAdminDashboardStats;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={<Building2 className="h-4 w-4" />}
        title="Total Organizations"
        value={formatNumber(stats.totalOrganizations)}
      />
      <KpiCard
        icon={<Users className="h-4 w-4" />}
        title="Total Users"
        value={formatNumber(stats.totalUsers)}
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        title="Total Leads"
        value={formatNumber(stats.totalLeads)}
      />
      <KpiCard
        icon={<UserRoundCog className="h-4 w-4" />}
        title="Total Prospects"
        value={formatNumber(stats.totalProspects)}
      />
      <KpiCard
        icon={<FileText className="h-4 w-4" />}
        title="Total Quotations"
        value={formatNumber(stats.totalQuotations)}
      />
      <KpiCard
        icon={<IndianRupee className="h-4 w-4" />}
        subtitle="Lifetime, live tenants"
        title="Approved Quotation Value"
        value={formatCompactCurrency(stats.approvedQuotationRevenue)}
      />
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className={dashboardPanelClass}>
        <PanelHeader
          // action={
          //   <TooltipProvider>
          //     <UiTooltip>
          //       <TooltipTrigger asChild>
          //         <Button
          //           aria-label="Organization lead distribution options"
          //           className="h-7 w-7 rounded-full"
          //           size="icon-sm"
          //           type="button"
          //           variant="ghost"
          //         >
          //           <MoreVertical className="h-4 w-4" />
          //         </Button>
          //       </TooltipTrigger>
          //       <TooltipContent>Sorted by lead count</TooltipContent>
          //     </UiTooltip>
          //   </TooltipProvider>
          // }
          title="Org-wise Lead Distribution"
        />
        <OrgLeadDistribution stats={stats} />
      </section>

      <section className={dashboardPanelClass}>
        <PanelHeader title="Lead Trend" />
        <Tabs defaultValue="monthly">
          <TabsList className="mb-2 h-8 rounded-lg">
            <TabsTrigger className="h-6 rounded-md px-3 text-xs" value="monthly">
              Last 6 Months
            </TabsTrigger>
            <TabsTrigger className="h-6 rounded-md px-3 text-xs" value="weekly">
              Last 6 Weeks
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
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <section className={`${dashboardPanelClass} min-h-73`}>
        <PanelHeader title="Recent Organizations" />
        <RecentOrganizationsTable organizations={stats.recentOrganizations} />
      </section>

      <section className={`${dashboardPanelClass} min-h-73 `}>
        <PanelHeader title="Organization Status" />
        <OrganizationStatusChart stats={stats.organizationStatus} />
      </section>
    </div>
  </div>
);

export const SuperAdminDashboardWidget = ({ stats }: { stats: DashboardStats }) => {
  if (!("totalOrganizations" in stats)) return null;
  return <SuperAdminDashboardContent stats={stats} />;
};
