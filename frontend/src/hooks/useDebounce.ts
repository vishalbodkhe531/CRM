import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * 
 * Delays updating a value until a specified delay has passed.
 * Useful for preventing rapid re-renders or API calls (e.g. during search typing).
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
