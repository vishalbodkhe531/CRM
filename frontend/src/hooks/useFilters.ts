import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  FilterConfigItem,
  FilterState,
  ActiveFilter,
} from "../types/filter.types";

interface UseFiltersProps {
  config: FilterConfigItem[];
  onFiltersChange?: (filters: FilterState) => void;
}

type DraftFilterState = {
  baseKey: string;
  filters: FilterState;
};

export const useFilters = ({ config, onFiltersChange }: UseFiltersProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sanitizeFilters = useCallback((filters: FilterState): FilterState => {
    const sanitized: FilterState = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (Array.isArray(value) && value.length === 0) return;
      sanitized[key] = value;
    });
    return sanitized;
  }, []);

  const parseFiltersFromUrl = useCallback(
    (params: URLSearchParams): FilterState => {
      const filters: FilterState = {};
      config.forEach((item) => {
        const value = params.get(item.name);
        if (!value) return;
        filters[item.name] =
          item.type === "checkbox-group" ? value.split(",") : value;
      });
      return filters;
    },
    [config],
  );

  const appliedFilters = useMemo(() => {
    return sanitizeFilters(parseFiltersFromUrl(searchParams));
  }, [parseFiltersFromUrl, sanitizeFilters, searchParams]);

  const appliedKey = useMemo(
    () => JSON.stringify(appliedFilters),
    [appliedFilters],
  );
  const [draftState, setDraftState] = useState<DraftFilterState>(() => ({
    baseKey: appliedKey,
    filters: appliedFilters,
  }));
  const draftFilters =
    draftState.baseKey === appliedKey ? draftState.filters : appliedFilters;

  const setDraftForCurrent = useCallback(
    (
      updater:
        | FilterState
        | ((currentFilters: FilterState) => FilterState),
    ) => {
      setDraftState((previous) => {
        const currentFilters =
          previous.baseKey === appliedKey ? previous.filters : appliedFilters;

        return {
          baseKey: appliedKey,
          filters:
            typeof updater === "function" ? updater(currentFilters) : updater,
        };
      });
    },
    [appliedFilters, appliedKey],
  );

  const updateDraft = useCallback(
    (name: string, value: string | string[] | undefined) => {
      setDraftForCurrent((previous) => ({ ...previous, [name]: value }));
    },
    [setDraftForCurrent],
  );

  const toggleDraftCheckbox = useCallback(
    (name: string, value: string) => {
      setDraftForCurrent((previous) => {
        const current = (previous[name] as string[]) || [];
        const updated = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];

        return {
          ...previous,
          [name]: updated.length > 0 ? updated : undefined,
        };
      });
    },
    [setDraftForCurrent],
  );

  const applyFilters = useCallback(() => {
    const nextFilters = sanitizeFilters(draftFilters);
    const nextKey = JSON.stringify(nextFilters);
    const newParams = new URLSearchParams(searchParams);

    config.forEach((item) => newParams.delete(item.name));
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (!value) return;
      newParams.set(key, Array.isArray(value) ? value.join(",") : value);
    });

    setSearchParams(newParams);
    setDraftState({ baseKey: nextKey, filters: nextFilters });
    onFiltersChange?.(nextFilters);
  }, [
    config,
    draftFilters,
    onFiltersChange,
    sanitizeFilters,
    searchParams,
    setSearchParams,
  ]);

  const resetFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    config.forEach((item) => newParams.delete(item.name));

    setSearchParams(newParams);
    setDraftState({ baseKey: "{}", filters: {} });
    onFiltersChange?.({});
  }, [config, onFiltersChange, searchParams, setSearchParams]);

  const removeFilterValue = useCallback(
    (name: string, value: string) => {
      const current = appliedFilters[name];
      const nextValue = Array.isArray(current)
        ? current.filter((entry) => entry !== value)
        : undefined;

      const nextFilters: FilterState = { ...appliedFilters };
      if (nextValue && nextValue.length > 0) {
        nextFilters[name] = nextValue;
      } else {
        delete nextFilters[name];
      }

      const normalizedFilters = sanitizeFilters(nextFilters);
      const newParams = new URLSearchParams(searchParams);
      if (nextValue && nextValue.length > 0) {
        newParams.set(name, nextValue.join(","));
      } else {
        newParams.delete(name);
      }

      setSearchParams(newParams);
      setDraftState({
        baseKey: JSON.stringify(normalizedFilters),
        filters: normalizedFilters,
      });
      onFiltersChange?.(normalizedFilters);
    },
    [
      appliedFilters,
      onFiltersChange,
      sanitizeFilters,
      searchParams,
      setSearchParams,
    ],
  );

  const activeChips = useMemo(() => {
    const chips: ActiveFilter[] = [];
    config.forEach((item) => {
      const value = appliedFilters[item.name];
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((v) => {
          const option = item.options?.find((opt) => opt.value === v);
          chips.push({
            key: item.name,
            label: item.label,
            value: v,
            valueLabel: option?.label || v,
          });
        });
      } else {
        const option = item.options?.find((opt) => opt.value === value);
        chips.push({
          key: item.name,
          label: item.label,
          value: value as string,
          valueLabel: option?.label || (value as string),
        });
      }
    });
    return chips;
  }, [appliedFilters, config]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(sanitizeFilters(draftFilters)) !== appliedKey;
  }, [appliedKey, draftFilters, sanitizeFilters]);

  return {
    appliedFilters,
    draftFilters,
    activeChips,
    updateDraft,
    toggleDraftCheckbox,
    applyFilters,
    resetFilters,
    removeFilterValue,
    hasChanges,
    activeCount: activeChips.length,
  };
};
