import { cn } from "@/utils/cn";

export interface FunnelChartItem {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  items: FunnelChartItem[];
  className?: string;
  minBarPercent?: number;
  showPercent?: boolean;
  valueLabel?: string;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const FunnelChart = ({
  items,
  className,
  minBarPercent = 12,
  showPercent = true,
  valueLabel = "records",
}: FunnelChartProps) => {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const width = item.value > 0
          ? Math.max(minBarPercent, (item.value / maxValue) * 100)
          : 0;
        const percent = totalValue > 0
          ? Math.round((item.value / totalValue) * 100)
          : 0;

        return (
          <div
            className="grid grid-cols-[92px_minmax(0,1fr)_54px] items-center gap-3 sm:grid-cols-[132px_minmax(0,1fr)_72px]"
            key={item.label}
          >
            <span
              className="truncate text-xs font-semibold text-muted-foreground"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="h-7 min-w-0 border-b border-border/70">
              <div
                aria-label={`${item.label}: ${formatNumber(item.value)} ${valueLabel}`}
                className="h-full transition-[width] duration-200"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color ?? "rgb(var(--primary))",
                }}
                title={`${item.label}: ${formatNumber(item.value)} ${valueLabel}`}
              />
            </div>
            <span className="text-right text-xs font-bold text-foreground">
              {formatNumber(item.value)}
              {showPercent ? (
                <span className="block text-[10px] font-semibold text-muted-foreground">
                  {percent}%
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FunnelChart;
