import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLeadReports } from "../hooks/useReports";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import TablePagination from "@/components/common/TablePagination";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import {
  crmChartColors,
  reportMetricCardClass,
  reportMutedNoteClass,
  reportPanelClass,
  reportSectionTitleClass,
} from "@/components/common/uiTokens";
import type { ReportFilters } from "../types";
import { FileText, Users, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/utils/cn";

interface LeadReportsProps {
  filters: ReportFilters;
}

const COLORS = crmChartColors.lead;
const STATUS_COLORS: Record<string, string> = {
  New: crmChartColors.lead[0],
  Contacted: crmChartColors.lead[1],
  Qualified: crmChartColors.lead[2],
  Lost: crmChartColors.status.warning,
  Converted: crmChartColors.status.neutral,
};

interface StatusCount {
  status: string;
  count: number;
}

interface SourceCount {
  source: string;
  count: number;
}

interface StatusPieDatum {
  name: string;
  value: number;
}

interface ExecutiveStats {
  executiveId: string;
  executiveName: string;
  totalAssigned: number;
  active: number;
  converted: number;
  lost: number;
}

export const LeadReports = ({ filters }: LeadReportsProps) => {
  const user = useAppSelector((state) => state.auth.user);
  const isExecutive = user?.role === ROLES.EXECUTIVE;

  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error } = useLeadReports({
    ...filters,
    page,
    limit,
  });

  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingState message="Loading Lead Reports..." />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load lead reports"
        }
      />
    );

  const byStatus: StatusCount[] = data?.byStatus || [];
  const bySource: SourceCount[] = data?.bySource || [];
  const byExecutive: ExecutiveStats[] = data?.byExecutive || [];
  const records = data?.records || [];
  const meta = data?.meta;

  const totalLeads =
    meta?.total ??
    byStatus.reduce((acc: number, curr: StatusCount) => acc + curr.count, 0);
  const convertedLeads =
    byStatus.find((s: StatusCount) => s.status === "Converted")?.count || 0;
  const lostLeads =
    byStatus.find((s: StatusCount) => s.status === "Lost")?.count || 0;
  const activeLeads = totalLeads - convertedLeads - lostLeads;

  const statusPieData: StatusPieDatum[] = byStatus
    .filter((s: StatusCount) => s.count > 0)
    .map((s: StatusCount) => ({
      name: s.status,
      value: s.count,
    }));

  const sourceBarData = bySource;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn(reportMetricCardClass, "relative overflow-hidden")}>
          <div className="flex justify-between items-start ">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Leads
              </span>
              <h2 className="text-2xl font-bold text-foreground">
                {totalLeads}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className={cn(reportMutedNoteClass, "flex items-center gap-1")}>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Matching current report filters
          </div>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Converted
              </span>
              <h2 className="text-2xl font-bold text-foreground">
                {convertedLeads}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            Lead converted to Prospect rate:{" "}
            {totalLeads > 0
              ? ((convertedLeads / totalLeads) * 100).toFixed(1)
              : 0}
            %
          </p>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Leads
              </span>
              <h2 className="text-2xl font-bold ">{activeLeads}</h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            Leads in New, Contacted, or Qualified status
          </p>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Lost Leads
              </span>
              <h2 className="text-2xl font-bold ">{lostLeads}</h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <TrendingUp className="h-5 w-5 rotate-180" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>Unqualified leads count</p>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className={cn(reportPanelClass, "lg:col-span-5 space-y-4")}>
          <h3 className={reportSectionTitleClass}>Leads by Status</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_COLORS[entry.name] ??
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} leads`, "Count"]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">
                No status data available
              </p>
            )}
          </div>
        </Card>

        <Card className={cn(reportPanelClass, "lg:col-span-7 space-y-4")}>
          <h3 className={reportSectionTitleClass}>Leads by Source</h3>
          <div className="h-72 w-full">
            {sourceBarData.some((s: SourceCount) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sourceBarData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgb(var(--border))"
                  />
                  <XAxis
                    dataKey="source"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip formatter={(value) => [`${value} leads`, "Count"]} />
                  <Bar
                    dataKey="count"
                    fill={crmChartColors.lead[0]}
                    radius={[4, 4, 0, 0]}
                    barSize={36}
                  >
                    {sourceBarData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No source data available
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Executive stats (Only Managers/Admins/Super Admins) */}
      {!isExecutive && byExecutive.length > 0 && (
        <Card className={cn(reportPanelClass, "space-y-4")}>
          <h3 className={reportSectionTitleClass}>Leads by Executive</h3>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-bold text-foreground">
                    Executive Name
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-center">
                    Total Assigned
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-center">
                    Active Leads
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-center">
                    Converted Leads
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-center text-amber-600">
                    Lost Leads
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byExecutive.map((exec: ExecutiveStats) => (
                  <TableRow key={exec.executiveId}>
                    <TableCell className="text-xs font-bold">
                      {exec.executiveName}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {exec.totalAssigned}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {exec.active}
                    </TableCell>
                    <TableCell className="text-xs text-center font-semibold text-foreground">
                      {exec.converted}
                    </TableCell>
                    <TableCell className="text-xs text-center font-semibold text-amber-600">
                      {exec.lost}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Detailed Records Table */}
      <Card className={cn(reportPanelClass, "space-y-4")}>
        <h3 className={reportSectionTitleClass}>Lead Records Details</h3>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground w-[120px]">
                  Lead No
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Name
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Company
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Email
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Mobile
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Source
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Executive
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length > 0 ? (
                records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <TableCell className="text-xs font-bold ">
                      {record.leadNo}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {record.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.companyName}
                    </TableCell>
                    <TableCell className="text-xs">{record.email}</TableCell>
                    <TableCell className="text-xs">{record.mobile}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.source}
                    </TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.executiveName}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {new Date(record.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    No records found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {meta && (
          <TablePagination
            currentPage={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            totalItems={meta.total}
            pageSize={limit}
            itemLabel="leads"
          />
        )}
      </Card>
    </div>
  );
};
