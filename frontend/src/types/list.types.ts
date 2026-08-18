import type { ActiveFilter, FilterState } from "./filter.types";

/**
 * Common props for Toolbar components used in list views.
 * Designed to be populated by useListView's toolbarProps.
 */
export interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  
  // Filter Engine Props
  draftFilters: FilterState;
  activeChips: ActiveFilter[];
  activeCount: number;
  hasChanges: boolean;
  onToggleCheckbox: (name: string, value: string) => void;
  onUpdateField: (name: string, value: string | string[] | undefined) => void;
  onApply: () => void;
  onReset: () => void;
  onRemoveChip: (name: string, value: string) => void;
}
