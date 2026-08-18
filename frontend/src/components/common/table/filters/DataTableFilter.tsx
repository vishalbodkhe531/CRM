import React, { useMemo, useState } from "react";
import { Filter as FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FilterField from "./FilterField";
import FilterChips from "./FilterChips";
import type {
  FilterConfigItem,
  FilterState,
  ActiveFilter,
} from "@/types/filter.types";

interface DataTableFilterProps {
  config: FilterConfigItem[];
  draftFilters: FilterState;
  activeCount: number;
  activeChips: ActiveFilter[];
  hasChanges: boolean;
  onToggleCheckbox: (name: string, value: string) => void;
  onUpdateField: (name: string, value: string | string[] | undefined) => void;
  onApply: () => void;
  onReset: () => void;
  onRemoveChip: (name: string, value: string) => void;
}

const DataTableFilter: React.FC<DataTableFilterProps> = ({
  config,
  draftFilters,
  activeCount,
  activeChips,
  hasChanges,
  onToggleCheckbox,
  onUpdateField,
  onApply,
  onReset,
  onRemoveChip,
}) => {
  const [open, setOpen] = useState(false);

  const draftChips = useMemo(() => {
    const chips: ActiveFilter[] = [];

    config.forEach((item) => {
      const value = draftFilters[item.name];
      if (!value) return;

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          const option = item.options?.find((opt) => opt.value === entry);
          chips.push({
            key: item.name,
            label: item.label,
            value: entry,
            valueLabel: option?.label || entry,
          });
        });
        return;
      }

      const option = item.options?.find((opt) => opt.value === value);
      chips.push({
        key: item.name,
        label: item.label,
        value,
        valueLabel: option?.label || value,
      });
    });

    return chips;
  }, [config, draftFilters]);

  const visibleChips = open ? draftChips : activeChips;
  const visibleCount = open ? draftChips.length : activeCount;

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  const handleReset = () => {
    onReset();
    // Removed setOpen(false) — keep popover open so user can re-filter
  };

  const handleRemoveChip = (name: string, value: string) => {
    if (!hasChanges) {
      onRemoveChip(name, value);
      return;
    }

    const current = draftFilters[name];
    if (Array.isArray(current)) {
      const nextValue = current.filter((entry) => entry !== value);
      onUpdateField(name, nextValue.length > 0 ? nextValue : undefined);
      return;
    }

    onUpdateField(name, undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="cursor-pointer h-10"
              aria-label="Filter records"
            >
              <FilterIcon className="h-4 w-4" />
              {visibleCount > 0 && (
                <span className="flex min-w-[20px] items-center justify-center rounded-full bg-primary p-1 text-[11px] font-bold text-primary-foreground leading-none">
                  {visibleCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Apply filters</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className="flex w-[calc(100vw-2rem)] max-w-80 flex-col overflow-hidden rounded-2xl border-border/40 p-0 shadow-xl"
      >
        <div className="max-h-[min(60vh,calc(var(--radix-popover-content-available-height)-3.75rem))] overflow-y-auto overscroll-contain scrollbar-hide">
          {visibleChips.length > 0 && (
            <div className="p-2 pb-2 border-b border-border/30 bg-muted/5">
              <FilterChips
                chips={visibleChips}
                onRemove={handleRemoveChip}
                className="px-0 py-0 gap-1.5"
              />
            </div>
          )}
          <div className="p-5 space-y-6">
            {config.map((item) => (
              <FilterField
                key={item.name}
                item={item}
                value={draftFilters[item.name]}
                onValueChange={onUpdateField}
                onToggleCheckbox={onToggleCheckbox}
              />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 p-2 bg-muted/20 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1 rounded-xl h-10 border-border/40 hover:bg-background hover:text-foreground font-semibold"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!hasChanges}
            className="flex-1 rounded-xl h-10 bg-primary hover:opacity-90 text-primary-foreground font-semibold shadow-md active:scale-[0.98] transition-transform"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DataTableFilter;
