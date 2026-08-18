import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DataTableFilter from "@/components/common/table/filters/DataTableFilter";
import TooltipLabel from "@/components/common/TooltipLabel";
import type { ListToolbarProps } from "@/types/list.types";
import type { FilterConfigItem } from "@/types/filter.types";

interface TableToolbarProps extends ListToolbarProps {
  title: string;
  description?: string;
  filterConfig: FilterConfigItem[];
  searchPlaceholder?: string;
  addButtonLabel?: string;
  showAddButton?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  onAddClick?: () => void;
  extraActions?: React.ReactNode;
}

/**
 * TableToolbar Component
 *
 * A generic, standardized toolbar for list views.
 * Replaces feature-specific toolbars (LeadsToolbar, UsersToolbar, etc.).
 */
const TableToolbar = ({
  title,
  description,
  filterConfig,
  searchPlaceholder = "Search...",
  addButtonLabel = "+ Add New",
  showAddButton = true,
  showSearch = true,
  showFilter = true,
  search,
  onSearchChange,
  onAddClick,
  draftFilters,
  activeChips,
  activeCount,
  hasChanges,
  onToggleCheckbox,
  onUpdateField,
  onApply,
  onReset,
  onRemoveChip,
  extraActions,
}: TableToolbarProps) => {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="sr-only">
        {title}
        {description ? ` - ${description}` : ""}
      </span>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        {showFilter && (
          <DataTableFilter
            config={filterConfig}
            draftFilters={draftFilters}
            activeChips={activeChips}
            activeCount={activeCount}
            hasChanges={hasChanges}
            onToggleCheckbox={onToggleCheckbox}
            onUpdateField={onUpdateField}
            onApply={onApply}
            onReset={onReset}
            onRemoveChip={onRemoveChip}
          />
        )}
        {showSearch && (
          <div className="relative w-full sm:max-w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 w-full bg-card pl-10 pr-4"
            />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {extraActions}
        {showAddButton && (
          <TooltipLabel label="Create new record">
            <Button
              type="button"
              onClick={onAddClick}
              className="h-10 px-5 font-bold shadow-sm"
            >
              {addButtonLabel}
            </Button>
          </TooltipLabel>
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
