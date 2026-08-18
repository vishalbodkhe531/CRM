export const crmChartColors = {
  lead: ["#004CD0", "#0284C7", "#10B981", "#f59e0b", "#64748b"],
  quotation: {
    APPROVED: "#22c55e",
    PENDING: "#d97706",
    REJECTED: "#dc2626",
    neutral: "#64748b",
  },
  status: {
    success: "#22c55e",
    warning: "#d97706",
    error: "#dc2626",
    inactive: "#64748b",
    neutral: "#475569",
  },
};

export const dashboardPanelClass =
  "rounded-xl border border-border bg-card px-4 py-2 shadow-sm transition-colors";

export const dashboardKpiClass =
  "min-w-0 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors";

export const dashboardSoftPanelClass =
  "rounded-xl border border-border bg-muted/20 p-3";

export const dashboardTooltipStyle = {
  backgroundColor: "rgb(var(--popover))",
  border: "1px solid rgb(var(--border))",
  borderRadius: "10px",
  color: "rgb(var(--popover-foreground))",
};

export const dashboardTooltipTextStyle = {
  color: "rgb(var(--popover-foreground))",
};

/**
 * Chart series colours. Recharts needs a concrete colour string rather than a
 * class, so these read the same CSS variables the rest of the theme uses and
 * therefore follow dark/light like everything else.
 */
export const chartSeriesColor = {
  primary: "rgb(var(--chart-series-1))",
  secondary: "rgb(var(--chart-series-2))",
  track: "rgb(var(--muted))",
  statusActive: "rgb(var(--chart-status-active))",
  statusSuspended: "rgb(var(--warning))",
  statusArchived: "rgb(var(--muted-foreground))",
  axis: "rgb(var(--muted-foreground))",
};

export const pagePanelClass =
  "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6";

export const statePanelClass =
  "flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground";

export const reportMetricCardClass =
  "min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5";

export const reportPanelClass = "rounded-xl p-4 sm:p-5";

export const reportSectionTitleClass =
  "border-b border-border pb-3 text-sm font-bold text-foreground";

export const reportMutedNoteClass =
  "mt-3 text-xs font-medium text-muted-foreground";
