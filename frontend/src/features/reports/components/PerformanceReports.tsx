import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePerformanceReports } from "../hooks/useReports";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import {
  crmChartColors,
  reportPanelClass,
} from "@/components/common/uiTokens";
import type { ReportFilters } from "../types";
import { Trophy, CalendarCheck2, Activity } from "lucide-react";
import { cn } from "@/utils/cn";

interface PerformanceReportsProps {
  filters: ReportFilters;
}

export const PerformanceReports = ({ filters }: PerformanceReportsProps) => {
  const { data, isLoading, isError, error } = usePerformanceReports(filters);

  if (isLoading) return <div className="h-96 flex items-center justify-center"><LoadingState message="Loading Performance Reports..." /></div>;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Failed to load performance reports"} />;

  const performance = data?.executivePerformance || [];

  // Sort by conversion percentage to show leaderboard
  const leaderboard = [...performance].sort((a, b) => b.conversionPercentage - a.conversionPercentage);

  // Chart data
  const conversionChartData = performance.map(p => ({
    name: p.executiveName,
    "Conversion %": p.conversionPercentage
  }));

  const followUpChartData = performance.map(p => ({
    name: p.executiveName,
    "Scheduled": p.scheduledFollowUps,
    "Completed": p.completedFollowUps
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead conversion comparison chart */}
        <Card className={cn(reportPanelClass, "space-y-4")}>
          <div className="flex items-center gap-2 border-b pb-2 border-border/40">
            <Trophy className="h-4.5 w-4.5 text-amber-600" />
            <h3 className="text-sm font-bold text-foreground">Lead Conversion Leaderboard</h3>
          </div>
          <div className="h-72 w-full pt-2">
            {conversionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(value) => [`${value}%`, "Conversion Rate"]} />
                  <Bar dataKey="Conversion %" fill={crmChartColors.status.success} radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No conversion data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Follow-up efficiency comparison chart */}
        <Card className={cn(reportPanelClass, "space-y-4")}>
          <div className="flex items-center gap-2 border-b pb-2 border-border/40">
            <CalendarCheck2 className="h-4.5 w-4.5 " />
            <h3 className="text-sm font-bold text-foreground">Follow-up Efficiency</h3>
          </div>
          <div className="h-72 w-full pt-2">
            {followUpChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followUpChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Scheduled" fill={crmChartColors.status.warning} radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Completed" fill={crmChartColors.status.success} radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No follow-up data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Leaderboard/Detail Table */}
      <Card className={cn(reportPanelClass, "space-y-4")}>
        <div className="flex items-center gap-2 border-b pb-2 border-border/40">
          <Activity className="h-4.5 w-4.5 " />
          <h3 className="text-sm font-bold text-foreground">Executive Performance Leaderboard</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground w-[50px] text-center">Rank</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Executive Name</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Assigned Leads</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Converted Leads</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center ">Lead Conversion %</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center">Scheduled Follow-ups</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center ">Completed Follow-ups</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center text-amber-600">Pending Follow-ups</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-center ">Follow-up Completion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length > 0 ? (
                leaderboard.map((exec, index) => (
                  <TableRow key={exec.executiveId} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="text-xs font-extrabold text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-xs font-bold">{exec.executiveName}</TableCell>
                    <TableCell className="text-xs text-center">{exec.assignedLeads}</TableCell>
                    <TableCell className="text-xs text-center">{exec.convertedLeads}</TableCell>
                    <TableCell className="text-xs text-center font-extrabold ">{exec.conversionPercentage}%</TableCell>
                    <TableCell className="text-xs text-center">{exec.scheduledFollowUps}</TableCell>
                    <TableCell className="text-xs text-center  font-semibold">{exec.completedFollowUps}</TableCell>
                    <TableCell className="text-xs text-center text-amber-600 font-semibold">{exec.pendingFollowUps}</TableCell>
                    <TableCell className="text-xs text-center font-extrabold ">{exec.followUpCompletionRate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                    No performance data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
