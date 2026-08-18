# State Management

Use the smallest state owner that matches the data lifetime.

```text
Redux Toolkit     -> auth and synchronous app context
TanStack Query    -> backend/server state
React local state -> local UI state
URL search params -> shareable list filters
```

## State Ownership

| State | Owner | Current examples |
| --- | --- | --- |
| Authenticated user | Redux auth slice | `features/auth/store/slice.ts` |
| Selected tenant workspace | Redux auth slice | `selectedOrganizationId` for super admin |
| API collections/details | TanStack Query | leads, users, items, prospects, quotations, billing |
| Filters and pagination | `useListView`, `useFilters`, URL params | list pages |
| Form drafts | React Hook Form/local state | feature form components |
| Dialogs/tabs/menus | `useState` | confirm dialogs, active tabs |

## Redux Store

```ts
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(toastListenerMiddleware.middleware),
});
```

The auth slice stores:

- `user: AuthUser | null`
- `selectedOrganizationId: string | null`
- `loading: boolean`
- `error: string | null`
- `fetchMeRequestId: string | null`

Auth thunks include `bootstrapAuth`, `fetchMe`, `login`, `signup`, `updateProfile`, `changePassword`, and `logout`.

## Auth Bootstrap

`useAuthBootstrap` runs once in `App`. It dispatches `bootstrapAuth`, which:

1. Checks for an in-memory access token.
2. Calls `/auth/refresh` if no access token exists.
3. Stores the returned access token in `tokenStore`.
4. Calls `/auth/me`.
5. Clears token/auth state if refresh or `/me` fails.

## TanStack Query

`src/app/queryClient.ts` sets:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(extractApiError(error).message);
    },
  }),
});
```

Query errors toast globally. Mutation errors are handled in mutation hooks because each mutation needs context-specific copy.

## Query Keys

Use `src/lib/queryKeys.ts` for all query keys. Keys are grouped by domain and include params plus organization context where needed.

```ts
queryKeys.leads.list(params, selectedOrgId);
queryKeys.leads.detail(id, selectedOrgId);
queryKeys.billing.subscription(selectedOrgId);
queryKeys.announcements.feed(userId, includeDismissed);
```

Use `null` for empty optional parts so keys stay stable.

## List State

`useListView` composes:

- Search state with a 400 ms debounce.
- Page and page-size state.
- `useFilters` URL-backed filters.
- A `queryParams` object ready for feature hooks.
- Toolbar and filter props for shared table UI.

`useFilters` keeps applied filters in `URLSearchParams`, supports draft filter changes, active chips, apply/reset, and chip removal.

## Local State

Use local state for UI-only concerns:

```tsx
const [isOpen, setIsOpen] = useState(false);
const [activeTab, setActiveTab] = useState("details");
```

Do not move modal state, tabs, hover state, or form drafts into Redux.

## Avoid

- Redux slices for server-backed features.
- React Query for auth state.
- Inline query keys.
- `useEffect` data fetching for API resources.
- Keeping unpaginated datasets in memory when the backend supports paging.
