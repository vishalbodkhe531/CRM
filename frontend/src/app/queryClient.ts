import { QueryClient, QueryCache } from '@tanstack/react-query';
import { extractApiError } from '@/utils//apiError';
import { toast } from '@/utils/toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000, // 2 minutes stale time to avoid redundant re-fetches
      gcTime: 600_000, // 10 minutes cache retention
      retry: 1,
      refetchOnWindowFocus: false, // Prevents network flooding on tab switching
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(extractApiError(error).message);
    },
  }),
});
