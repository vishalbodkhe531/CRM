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
import { useProspectReports } from "../hooks/useReports";
import TablePagination from "@/components/common/TablePagination";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import FunnelChart from "@/components/common/FunnelChart";
import {
  crmChartColors,
  reportMetricCardClass,
  reportMutedNoteClass,
  reportPanelClass,
  reportSectionTitleClass,
} from "@/components/common/uiTokens";
import type { ReportFilters } from "../types";
import { UserCheck, Target, Award, BarChart2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface ProspectReportsProps {
  filters: ReportFilters;
}

const STAGE_COLORS: Record<string, string> = {
  "Initial Discussion": crmChartColors.lead[0],
  "Requirement Gathering": crmChartColors.lead[1],
  "Proposal Sent": crmChartColors.lead[2],
  Negotiation: crmChartColors.status.warning,
  Won: crmChartColors.status.success,
  Lost: crmChartColors.status.neutral,
};

interface StageCount {
  stage: string;
  count: number;
}

export const ProspectReports = ({ filters }: ProspectReportsProps) => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error } = useProspectReports({
    ...filters,
    page,
    limit,
  });

  if (isLoading)
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingState message="Loading Prospect Reports..." />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "Failed to load prospect reports"
        }
      />
    );

  const stageDistribution: StageCount[] = data?.stageDistribution || [];
  const conversionRate = data?.conversionRate || {
    leadToProspectRate: 0,
    prospectToCustomerRate: 0,
    totalLeads: 0,
    convertedLeads: 0,
    totalProspects: 0,
    wonProspects: 0,
  };
  const records = data?.records || [];
  const meta = data?.meta;

  // Re-order stages to represent a standard pipeline funnel flow
  const stageOrder = [
    "Initial Discussion",
    "Requirement Gathering",
    "Proposal Sent",
    "Negotiation",
    "Won",
    "Lost",
  ];
  const funnelData = stageOrder.map((s) => {
    const found = stageDistribution.find((d: StageCount) => d.stage === s);
    return {
      stage: s,
      count: found ? found.count : 0,
    };
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Prospects
              </span>
              <h2 className="text-2xl font-bold ">
                {conversionRate.totalProspects}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Target className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            Active prospects progressing in the pipeline
          </p>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Lead to Prospect %
              </span>
              <h2 className="text-2xl font-bold ">
                {conversionRate.leadToProspectRate}%
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            {conversionRate.convertedLeads} prospects converted from{" "}
            {conversionRate.totalLeads} leads
          </p>
        </Card>

        <Card className={reportMetricCardClass}>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Prospect to Customer %
              </span>
              <h2 className="text-2xl font-bold ">
                {conversionRate.prospectToCustomerRate}%
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className={reportMutedNoteClass}>
            {conversionRate.wonProspects} won deals from{" "}
            {conversionRate.totalProspects} prospects
          </p>
        </Card>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className={cn(reportPanelClass, "lg:col-span-12 space-y-4")}>
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-foreground">
              Sales Pipeline Stage Distribution
            </h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart2 className="h-3.5 w-3.5 text-primary" />
              Pipeline Funnel Overview
            </span>
          </div>
          <div className="w-full pt-3">
            {funnelData.some((f) => f.count > 0) ? (
              <FunnelChart
                className="max-w-4xl"
                items={funnelData.map((entry) => ({
                  label: entry.stage,
                  value: entry.count,
                  color: STAGE_COLORS[entry.stage],
                }))}
                valueLabel="prospects"
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center">
                <p className="text-xs text-muted-foreground">
                  No pipeline stage data available
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Detailed Records Table */}
      <Card className={cn(reportPanelClass, "space-y-4")}>
        <h3 className={reportSectionTitleClass}>
          Prospect Records Details
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground w-[120px]">
                  Prospect No
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground w-[100px]">
                  Lead No
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Name
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Company
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Current Stage
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Expected Value
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Target Close Date
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  Executive
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">
                  Created Date
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
                      {record.prospectNo}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.leadNo}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {record.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.companyName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge status={record.stage} />
                    </TableCell>
                    <TableCell className="text-xs font-bold text-right">
                      ₹
                      {record.expectedValue.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.closeDate}
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
                    No prospects found matching filters
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
            itemLabel="prospects"
          />
        )}
      </Card>
    </div>
  );
};
