import { useState, useCallback, useMemo } from "react";
import { useFilters } from "./useFilters";
import { useDebounce } from "./useDebounce";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/constants/pagination";
import type { FilterConfigItem } from "../types/filter.types";

interface UseListViewOptions {
  filterConfig: FilterConfigItem[];
  defaultPageSize?: number;
  minSearchLength?: number;
}

/**
 * useListView Hook
 * 
 * Centralizes common list view logic:
 * - Search with debouncing
 * - Pagination state and handlers
 * - Filter engine integration
 * - Automatic page reset on search/filter changes
 * - Prepared props for Toolbars and Table components
 */
export function useListView(options: UseListViewOptions) {
  const {
    filterConfig,
    defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
    minSearchLength = 2,
  } = options;

  // 1. Core States
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // 2. Debouncing
  const debouncedSearch = useDebounce(search, 400);

  // 3. Filter Engine Integration
  const filterEngine = useFilters({
    config: filterConfig,
  });

  // 4. Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 5. Wrap Filter Actions with Page Reset
  const onApplyFilters = useCallback(() => {
    filterEngine.applyFilters();
    setCurrentPage(1);
  }, [filterEngine]);

  const onResetFilters = useCallback(() => {
    filterEngine.resetFilters();
    setCurrentPage(1);
  }, [filterEngine]);

  const onRemoveChip = useCallback((name: string, value: string) => {
    filterEngine.removeFilterValue(name, value);
    setCurrentPage(1);
  }, [filterEngine]);

  // 6. Final Parameters for API Queries
  const queryParams = useMemo(() => {
    return {
      search:
        debouncedSearch.length >= minSearchLength
          ? debouncedSearch
          : undefined,
      page: currentPage,
      limit: pageSize,
      ...filterEngine.appliedFilters,
    };
  }, [
    debouncedSearch,
    currentPage,
    pageSize,
    filterEngine.appliedFilters,
    minSearchLength,
  ]);

  return {
    // Basic state
    search,
    currentPage,
    pageSize,
    debouncedSearch,
    
    // Aggregated params for api/hooks
    queryParams,

    // State setters/handlers
    onSearchChange: handleSearchChange,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,

    // Filter properties (for Toolmars/Filter UI)
    filterProps: {
      ...filterEngine,
      onApply: onApplyFilters,
      onReset: onResetFilters,
      onRemoveChip: onRemoveChip,
    },

    // Toolbar convenience props
    toolbarProps: {
      search,
      onSearchChange: handleSearchChange,
      draftFilters: filterEngine.draftFilters,
      activeChips: filterEngine.activeChips,
      activeCount: filterEngine.activeCount,
      hasChanges: filterEngine.hasChanges,
      onToggleCheckbox: filterEngine.toggleDraftCheckbox,
      onUpdateField: filterEngine.updateDraft,
      onApply: onApplyFilters,
      onReset: onResetFilters,
      onRemoveChip: onRemoveChip,
    }
  };
}
