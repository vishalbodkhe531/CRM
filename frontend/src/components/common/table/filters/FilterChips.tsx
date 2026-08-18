import React from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ActiveFilter } from "@/types/filter.types";

interface FilterChipsProps {
  chips: ActiveFilter[];
  onRemove: (name: string, value: string) => void;
  className?: string;
}

const FilterChips: React.FC<FilterChipsProps> = ({ chips, onRemove, className }) => {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <div
          key={`${chip.key}-${chip.value}`}
          className="group flex items-center gap-1.5 pl-2 pr-3 py-1 bg-background border border-border/80 rounded-lg text-[13px] font-semibold text-foreground/90 hover:border-primary/50 transition-all shadow-sm"
        >
          <button
            type="button"
            onClick={() => onRemove(chip.key, chip.value)}
            className="p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove filter ${chip.valueLabel}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span>{chip.valueLabel}</span>
        </div>
      ))}
    </div>
  );
};

export default FilterChips;
