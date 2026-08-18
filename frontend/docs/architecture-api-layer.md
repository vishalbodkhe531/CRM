# API Layer Architecture

All HTTP traffic goes through the shared Axios client in `src/lib/api/client.ts`. Interceptors are installed once from `src/app/store/index.ts` through `setupInterceptors` in `src/lib/api/interceptors.ts`.

## Client Setup

```ts
// src/lib/api/client.ts
export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 90000,
  paramsSerializer: { indexes: null },
  headers: { "Content-Type": "application/json" },
});
```

- Development fallback: `http://localhost:5000/api/v1`.
- Production requires `VITE_API_BASE_URL`.
- Arrays are serialized as repeated query keys, for example `status=ACTIVE&status=INACTIVE`.
- Endpoint constants must be relative to `/api/v1`. Do not include `/api/v1` inside feature endpoint files.

## Interceptor Responsibilities

| Concern | Current implementation |
| --- | --- |
| Access token | Read from `src/lib/api/tokenStore.ts`; sent as `Authorization: Bearer <token>` |
| Refresh cookie | Browser sends HTTP-only `refresh_token` with `withCredentials: true` |
| CSRF write header | Adds `x-requested-with: XMLHttpRequest` to `POST`, `PUT`, `PATCH`, and `DELETE` |
| Super admin org scope | Adds `x-organization-id` when `auth.selectedOrganizationId` is set |
| 401 handling | Queues failed requests, calls `/auth/refresh`, stores new access token, retries |
| Multi-tab auth sync | Uses `BroadcastChannel("auth_sync")` for refresh and logout events |
| Lapsed subscription | Handles HTTP 402, throttles toast, invalidates `queryKeys.billing.all` |

Do not duplicate this behavior in feature hooks or components.

## Endpoint Constants

```ts
// features/leads/api/endpoints.ts
export const LEAD_ENDPOINTS = {
  CREATE: "/leads",
  LIST: "/leads",
  GET: (id: string) => `/leads/${id}`,
  UPDATE: (id: string) => `/leads/${id}`,
  UPDATE_STATUS: (id: string) => `/leads/${id}/status`,
  DELETE: (id: string) => `/leads/${id}`,
  CONVERT: (id: string) => `/leads/${id}/convert`,
  ASSIGN: (id: string) => `/leads/${id}/assign`,
  IMPORT: "/leads/import",
  ASSIGNABLE_USERS: "/leads/assignable-users",
};
```

Current endpoint files exist for auth, users, organizations, items, leads, prospects, quotations, dashboard, reports, audit, announcements, signup requests, billing, and platform settings. Notifications define their endpoints inside `features/notifications/api/services.ts`.

## Service Layer

Most features use `createApiService` from `src/lib/api/service.utils.ts`. The helper returns the backend envelope, so services should unwrap `res.data` before returning to hooks when components need the payload directly.

```ts
const service = createApiService(api);

export const itemsService = {
  getItems: (params?: ItemListParams) =>
    service.get<Item[]>(ITEM_ENDPOINTS.LIST, { params }),

  getItemDetail: (id: string) =>
    service.get<Item>(ITEM_ENDPOINTS.GET(id)).then((res) => res.data),

  createItem: (payload: CreateItemInput) =>
    service.post<Item>(ITEM_ENDPOINTS.CREATE, payload).then((res) => res.data),
};
```

Direct `api.get/post/patch` is still used where the caller needs tighter control, such as auth payloads, multipart profile uploads, report exports, or blob downloads.

## Query Pattern

```ts
export const useLeads = (params?: LeadFilterValues) => {
  const selectedOrgId = useAppSelector(selectSelectedOrganizationId);

  return useQuery({
    queryKey: queryKeys.leads.list(params, selectedOrgId),
    queryFn: () => leadsService.getLeads(params),
    placeholderData: keepPreviousData,
  });
};
```

Use `queryKeys` from `src/lib/queryKeys.ts`. Include every value that changes the result, including selected organization context when the hook reads tenant-scoped data.

## Mutation Pattern

```ts
export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadInput | FormData) =>
      leadsService.createLead(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      toast.success("Lead created successfully");
    },
    onError: (error) => {
      toast.error(extractApiError(error).message);
    },
  });
};
```

All `POST`, `PUT`, `PATCH`, and `DELETE` operations should use `useMutation`, even when a component starts the action from a button.

## Response Contracts

Success envelope:

```ts
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}
```

Error envelope from the backend:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": 400,
  "errorCode": "VALIDATION_ERROR",
  "details": []
}
```

Normalize all errors with `extractApiError` from `src/utils/apiError.ts`. Components should not inspect `error.response` directly.

## CSRF Rules

The backend requires a non-empty `x-requested-with` or `x-csrf-token` header for state-changing methods. The interceptor adds `x-requested-with: XMLHttpRequest` automatically.

Backend CSRF exemptions are:

- `GET`, `HEAD`, and `OPTIONS`
- `POST /api/v1/auth/login`
- `GET /health`
- Internal job routes mounted before CSRF middleware

`POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` are protected writes and must carry the header.

## Avoid

- Raw `fetch()` in app code.
- New `axios.create()` instances outside `src/lib/api/client.ts`.
- Hardcoded full URLs in hooks/components.
- Returning the full backend envelope to view components unless the view explicitly needs `meta`.
- Manually setting auth, CSRF, or organization headers in feature code.
