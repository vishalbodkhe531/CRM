# Error Handling

Errors are normalized once and surfaced consistently through TanStack Query, mutation hooks, route state, and shared UI components.

## Backend Error Shape

```json
{
  "success": false,
  "error": "Validation failed",
  "code": 400,
  "errorCode": "VALIDATION_ERROR",
  "details": []
}
```

## Frontend Normalization

`src/utils/apiError.ts` is the only place that reads Axios error response internals.

```ts
export const extractApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return {
      success: false,
      status: data?.code ?? error.response?.status ?? 500,
      message: data?.error ?? error.message ?? "An unexpected error occurred",
      code: data?.errorCode,
      details: data?.details,
    };
  }

  return {
    success: false,
    status: 500,
    message: "An unexpected error occurred",
  };
};
```

Mapping:

| Backend field | Frontend field |
| --- | --- |
| `error` | `message` |
| `code` | `status` |
| `errorCode` | `code` |
| `details` | `details` |

## Query Errors

`src/app/queryClient.ts` has a global `QueryCache.onError` handler:

```ts
queryCache: new QueryCache({
  onError: (error) => {
    toast.error(extractApiError(error).message);
  },
});
```

Components should use `isError` for rendering an error state, but should not fire duplicate query-error toasts.

## Mutation Errors

Mutation hooks handle their own errors:

```ts
const createMutation = useMutation({
  mutationFn: (payload: CreateItemInput) => itemsService.createItem(payload),
  onError: (error) => {
    toast.error(extractApiError(error).message);
  },
});
```

This keeps mutation copy specific to the action.

## Interceptor-Level Errors

- `401` triggers access-token refresh and retries the original request once.
- Refresh failure clears auth state.
- `402` means the subscription or feature plan blocked the write. The interceptor shows a throttled toast and invalidates billing queries so the persistent billing UI can update.

## UI Error States

Use shared components:

```tsx
if (isLoading) return <LoadingState label="Loading users" />;
if (isError) return <ErrorState message="Failed to load users" />;
if (!data?.data.length) return <EmptyState message="No users found" />;
```

For forms, prefer Zod and React Hook Form field errors over local string state.

## Rules

- Do not inspect `error.response` outside `extractApiError`.
- Do not call `toast.error()` in components for query failures.
- Do handle mutation errors in mutation hooks.
- Do show explicit page-level states for loading, empty, and error cases.
- Do keep local UI success messages close to the user action.
