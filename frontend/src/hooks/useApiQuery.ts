import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

type MapperFn<T, R> = (data: T) => R;

/**
 * Standardized wrapper for useQuery that handles common API response patterns
 * and optional result mapping/normalization.
 */
export function useApiQuery<
  T,
  R = T,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<ApiResponse<T>>,
  options?: Omit<
    UseQueryOptions<ApiResponse<T>, Error, R, TQueryKey>,
    "queryKey" | "queryFn"
  >,
  mapper?: MapperFn<T, R>,
) {
  return useQuery({
    queryKey,
    queryFn,
    select: (response) => {
      if (mapper) {
        return mapper(response.data);
      }
      return response.data as unknown as R;
    },
    ...options,
  });
}
