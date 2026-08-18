import PageHeader from "@/components/common/PageHeader";
import TooltipLabel from "@/components/common/TooltipLabel";
import { FileText, Receipt, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { reportsService } from "../../api/services";
import { LeadReports } from "../LeadReports";
import { PerformanceReports } from "../PerformanceReports";
import { ProspectReports } from "../ProspectReports";
import { QuotationReports } from "../QuotationReports";
import { ReportFilters } from "../ReportFilters";
import type { ReportFilters as ReportFiltersType } from "../../types";

type ReportTab = "lead" | "prospect" | "quotation" | "performance";

export const ReportsView = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("lead");
  const [filters, setFilters] = useState<ReportFiltersType>({
    range: "All Time",
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleReset = () => {
    setFilters({
      range: "All Time",
    });
    toast.success("Filters reset successfully");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvData = await reportsService.exportCSV(activeTab, filters);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `CRM_${activeTab}_report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(
        `${activeTab.toUpperCase()} CSV report exported successfully!`,
      );
    } catch {
      toast.error("Failed to export report to CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: "lead" as ReportTab, label: "Lead Reports", icon: FileText },
    { id: "prospect" as ReportTab, label: "Prospect Reports", icon: Target },
    { id: "quotation" as ReportTab, label: "Quotation Reports", icon: Receipt },
    {
      id: "performance" as ReportTab,
      label: "Performance Reports",
      icon: Trophy,
    },
  ];

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Reports & Analytics"
        description="Monitor lead metrics, prospect sales funnels, quotations revenue trends, and employee productivity statistics."
        className="pb-0"
        action={
          <ReportFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            onExport={handleExport}
            isExporting={isExporting}
            activeTab={activeTab}
          />
        }
      />

      <section className="space-y-4">
        <div className="flex w-full gap-1 overflow-x-auto border-b border-border scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TooltipLabel key={tab.id} label={`Show ${tab.label.toLowerCase()}`}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  type="button"
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {tab.label}
                </button>
              </TooltipLabel>
            );
          })}
        </div>

        <div className="min-h-[500px]">
          {activeTab === "lead" && <LeadReports filters={filters} />}
          {activeTab === "prospect" && <ProspectReports filters={filters} />}
          {activeTab === "quotation" && (
            <QuotationReports filters={filters} />
          )}
          {activeTab === "performance" && (
            <PerformanceReports filters={filters} />
          )}
        </div>
      </section>
    </div>
  );
};

export default ReportsView;
