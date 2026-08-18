import type { ReactNode } from "react";
import TableToolbar from "@/components/common/table/TableToolbar";
import TablePagination from "@/components/common/TablePagination";
import type { PaginationMeta } from "@/types/api";
import type { FilterConfigItem } from "@/types/filter.types";
import type { ListToolbarProps } from "@/types/list.types";

interface ListViewLayoutProps extends Partial<ListToolbarProps> {
  // Header / Toolbar Props
  title: string;
  description?: string;
  filterConfig?: FilterConfigItem[];
  searchPlaceholder?: string;
  addButtonLabel?: string;
  showAddButton?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  onAddClick?: () => void;
  extraActions?: React.ReactNode;

  stats?: ReactNode;

  // Content
  table?: ReactNode;

  // Pagination Props
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  itemLabel?: string;

  // Extra (Dialogs, etc)
  children?: ReactNode;
}

/**
 * ListViewLayout Component
 *
 * A high-level layout wrapper for standardized list views.
 * Handles the composition of PageHeader, TableToolbar, TableContent, and Pagination.
 */
export const ListViewLayout = ({
  title,
  description,
  filterConfig = [] as FilterConfigItem[],
  searchPlaceholder,
  addButtonLabel,
  showAddButton,
  showSearch,
  showFilter,
  onAddClick,
  stats,
  table,
  meta,
  onPageChange,
  itemLabel = "items",
  children,
  extraActions,
  // ListToolbarProps — with safe defaults for optional usage
  search = "",
  onSearchChange = () => {},
  draftFilters = {},
  activeChips = [],
  activeCount = 0,
  hasChanges = false,
  onToggleCheckbox = () => {},
  onUpdateField = () => {},
  onApply = () => {},
  onReset = () => {},
  onRemoveChip = () => {},
}: ListViewLayoutProps) => {
  const hasToolbar =
    showSearch !== false ||
    showFilter !== false ||
    showAddButton !== false ||
    Boolean(extraActions);

  return (
    <div className="w-full space-y-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {stats}
      {hasToolbar && (
        <TableToolbar
          title={title}
          description={description}
          filterConfig={filterConfig}
          searchPlaceholder={searchPlaceholder}
          addButtonLabel={addButtonLabel}
          showAddButton={showAddButton}
          showSearch={showSearch}
          showFilter={showFilter}
          onAddClick={onAddClick}
          extraActions={extraActions}
          search={search}
          onSearchChange={onSearchChange}
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
      {table}
      {meta && meta.total > 0 && onPageChange && (
        <TablePagination
          currentPage={meta.page}
          totalPages={meta.totalPages || 1}
          onPageChange={onPageChange}
          totalItems={meta.total}
          pageSize={meta.limit}
          itemLabel={itemLabel}
        />
      )}
      {children}
    </div>
  );
};

export default ListViewLayout;
