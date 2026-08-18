import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import TooltipLabel from "@/components/common/TooltipLabel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAssignableUsers } from "@/features/leads";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { Download, Filter, RefreshCw } from "lucide-react";
import type { ReportFilters as ReportFiltersType } from "../types";

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onChange: (newFilters: ReportFiltersType) => void;
  onReset: () => void;
  onExport: () => void;
  isExporting?: boolean;
  activeTab?: string;
}

const RANGE_OPTIONS = [
  { value: "All Time", label: "All Time" },
  { value: "This Month", label: "This Month" },
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "Custom", label: "Custom Range" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "WEBSITE", label: "Website" },
  { value: "REFERENCE", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "ADVERTISE", label: "Advertise" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "EVENT", label: "Event" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

export const ReportFilters = ({
  filters,
  onChange,
  onReset,
  onExport,
  isExporting = false,
  activeTab,
}: ReportFiltersProps) => {
  const user = useAppSelector((state) => state.auth.user);
  const isExecutive = user?.role === ROLES.EXECUTIVE;

  const { data: assignableUsers = [], isLoading: isUsersLoading } =
    useAssignableUsers();

  const handleRangeChange = (value: string) => {
    if (value === "Custom") {
      const today = new Date().toISOString().split("T")[0];
      onChange({
        ...filters,
        range: "Custom",
        from: today,
        to: today,
      });
    } else {
      onChange({
        ...filters,
        range: value as ReportFiltersType["range"],
        from: undefined,
        to: undefined,
      });
    }
  };

  const handleFieldChange = (key: keyof ReportFiltersType, value: string) => {
    onChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const execOptions = [
    { value: "", label: isUsersLoading ? "Loading..." : "All Executives" },
    ...assignableUsers.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}`,
    })),
  ];

  return (
    <div className="flex w-full flex-col gap-2  sm:w-auto sm:flex-row sm:justify-end">
      <Popover>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-full hover:bg-primary-hover cursor-pointer rounded-md border-border bg-background shadow-none sm:w-9"
                aria-label="Filter reports"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter reports</TooltipContent>
        </Tooltip>

        <PopoverContent
          align="end"
          className="w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-xl border-border p-0 shadow-lg"
        >
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4 scrollbar-hide">
            <h3 className="text-sm font-bold text-foreground">
              Filter Reports
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Date Range
              </label>
              <Select
                value={filters.range}
                onValueChange={handleRangeChange}
                options={RANGE_OPTIONS}
              />
            </div>

            {filters.range === "Custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={filters.from || ""}
                    onChange={(e) => handleFieldChange("from", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={filters.to || ""}
                    onChange={(e) => handleFieldChange("to", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}

            {!isExecutive && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Sales Executive
                </label>
                <Select
                  value={filters.executiveId || ""}
                  onValueChange={(value) =>
                    handleFieldChange("executiveId", value)
                  }
                  options={execOptions}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Lead Source
              </label>
              <Select
                value={filters.source || ""}
                onValueChange={(value) => handleFieldChange("source", value)}
                options={SOURCE_OPTIONS}
              />
            </div>

            {activeTab === "performance" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Follow-up Status
                </label>
                <Select
                  value={filters.status || ""}
                  onValueChange={(value) => handleFieldChange("status", value)}
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "Scheduled", label: "Scheduled" },
                    { value: "Completed", label: "Completed" },
                    { value: "Pending", label: "Pending" },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-muted/20 p-3">
            <TooltipLabel label="Reset report filters">
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-9 w-full rounded-md border-border bg-background font-semibold shadow-none hover:bg-primary-hover hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </TooltipLabel>
          </div>
        </PopoverContent>
      </Popover>

      <TooltipLabel label="Export report data">
        <Button
          onClick={onExport}
          disabled={isExporting}
          className="h-9 w-full rounded-md bg-primary px-4 font-semibold text-primary-foreground shadow-none hover:bg-primary-hover sm:w-auto"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "CSV Export"}
        </Button>
      </TooltipLabel>
    </div>
  );
};
