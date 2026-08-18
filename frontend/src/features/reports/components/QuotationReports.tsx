import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import StatusBadge from "@/components/common/StatusBadge";
import TablePagination from "@/components/common/TablePagination";
import {
  crmChartColors,
  reportMetricCardClass,
  reportMutedNoteClass,
  reportPanelClass,
  reportSectionTitleClass,
} from "@/components/common/uiTokens";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Hourglass, PiggyBank, Receipt, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuotationReports } from "../hooks/useReports";
import type { ReportFilters } from "../types";
import { cn } from "@/utils/cn";

interface QuotationReportsProps {
  filters: ReportFilters;
}

const COLORS = [
  crmChartColors.status.success,
  crmChartColors.status.warning,
  crmChartColors.status.neutral,
];
const STATUS_COLORS: Record<string, string> = {
  Approved: crmChartColors.status.success,
  Pending: crmChartColors.status.warning,
  Rejected: crmChartColors.status.neutral,
};
const STATUS_BADGE_CLASSES: Record<string, string> = {
  APPROVED:
    "!border-primary/30 !bg-primary/10 !",
  PENDING:
    "!border-amber-500/30 !bg-amber-500/10 !text-amber-600 dark:!text-amber-400",
  REJECTED:
    "!border-border !bg-muted !text-muted-foreground",
};

interface StatusCount {
  status: string;
  count: number;
}

export const QuotationReports = ({ filters }: QuotationReportsProps) => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error } = useQuotationReports({
    ...filters,
    page,
    limit,
  });

  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingState message="Loading Quotation Reports..." />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "Failed to load quotation reports"
        }
      />
    );

  const byStatus: StatusCount[] = data?.byStatus || [];
  const revenue = data?.revenue || {
    totalRevenue: 0,
    approvedValue: 0,
    pendingValue: 0,
  };
  const monthlyTrend = data?.monthlyTrend || [];
  const records = data?.records || [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Revenue (Approved)
              </span>
              <h2 className="text-2xl font-bold ">
                ₹{revenue.totalRevenue.toLocaleString("en-IN")}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <div className={cn(reportMutedNoteClass, "flex items-center gap-1")}>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Realized revenue from approved quotations
          </div>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Approved Quotations Value
              </span>
              <h2 className="text-2xl font-bold ">
                ₹{revenue.approvedValue.toLocaleString("en-IN")}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            Sum total of approved proposals
          </p>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pending Quotations Value
              </span>
              <h2 className="text-2xl font-bold">
                ₹{revenue.pendingValue.toLocaleString("en-IN")}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Hourglass className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            Potential pipeline revenue in draft/pending
          </p>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className={cn(reportPanelClass, "lg:col-span-8 space-y-4")}>
          <h3 className={reportSectionTitleClass}>
            Monthly Revenue Trend
          </h3>
          <div className="h-72 w-full">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrend}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgb(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      value
                        ? `₹${Number(value).toLocaleString("en-IN")}`
                        : "₹0",
                      "Value",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    name="Approved Revenue"
                    stroke={crmChartColors.status.success}
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    name="Pending Revenue"
                    stroke={crmChartColors.status.warning}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No monthly trend data available
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className={cn(reportPanelClass, "lg:col-span-4 space-y-4")}>
          <h3 className={reportSectionTitleClass}>
            Quotations by Status
          </h3>
          <div className="h-72 w-full">
            {byStatus.some((s: StatusCount) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byStatus}
                  margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgb(var(--border))"
                  />
                  <XAxis
                    dataKey="status"
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
                  <Tooltip
                    formatter={(value) => [`${value} quotations`, "Count"]}
                  />
                  <Bar
                    dataKey="count"
                    fill={crmChartColors.status.success}
                    radius={[4, 4, 0, 0]}
                    barSize={36}
                  >
                    {byStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_COLORS[entry.status] ??
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No quotation status data available
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Records Table */}
      <Card className={cn(reportPanelClass, "space-y-4")}>
        <h3 className={reportSectionTitleClass}>
          Quotation Records Details
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground w-[130px]">
                  Quotation No
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Party Name
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Ref No
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Date
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Subtotal
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Tax Total
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Grand Total
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Executive
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
                      {record.quotationNo}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {record.partyName}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {record.refNo}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.date}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      ₹
                      {record.subtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      ₹
                      {record.taxTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold ">
                      ₹
                      {record.grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge
                        className={STATUS_BADGE_CLASSES[record.status]}
                        status={record.status}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.executiveName}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    No quotations found matching filters
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
            itemLabel="quotations"
          />
        )}
      </Card>
    </div>
  );
};
