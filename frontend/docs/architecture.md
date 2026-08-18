# Frontend Architecture

This SPA is a React 19, TypeScript, Vite 7 CRM frontend. It uses React Router 7 for navigation, TanStack Query v5 for server state, Redux Toolkit for auth-only app state, Axios for HTTP, Radix-style UI primitives, Tailwind CSS v4, React Hook Form, and Zod contracts shared with the backend.

## Runtime Flow

```tsx
// src/main.tsx
<Providers>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</Providers>
```

`Providers` wires Redux, TanStack Query, theme support, and React Query Devtools in development. `App` bootstraps auth, wraps routes in `ErrorBoundary`, `Suspense`, and `TooltipProvider`, then renders `AppRoutes`.

## Layers

| Layer | Current paths | Responsibility |
| --- | --- | --- |
| App shell | `src/app/*` | `queryClient`, Redux store, interceptor setup, providers, toast listener middleware |
| Routing | `src/components/routing/*`, `src/components/guards/*`, `src/pages/*` | Route declarations, auth guards, role guards, thin page wrappers |
| Features | `src/features/<feature>/*` | Domain API services, hooks, views, forms, tables, validators, types, constants |
| Shared UI | `src/components/common/*`, `src/components/ui/*`, `src/components/layout/*` | Reusable primitives, layout, table, dialogs, loading/empty/error states |
| API client | `src/lib/api/*`, `src/lib/queryKeys.ts` | Axios instance, auth/token interceptors, service helper, query key factory |
| Contracts | `src/contracts/*` | Backend-aligned DTOs, constants, and Zod validation schemas |
| Utilities | `src/hooks/*`, `src/utils/*`, `src/types/*`, `src/constants/*` | Cross-feature hooks, helpers, global types, app constants |

## Current Feature Modules

`announcements`, `audit`, `auth`, `billing`, `customers`, `dashboard`, `help`, `items`, `leads`, `notifications`, `organizations`, `platformSettings`, `prospects`, `quotations`, `reports`, `signupRequests`, and `users`.

Auth is the only feature with Redux state. All other feature data is server state handled by TanStack Query.

## Routing Model

Routes live in `src/components/routing/AppRoutes.tsx`.

- Public routes: `/` renders `AuthEntryRoute`, `/signup` renders signup.
- Protected tenant routes: `/dashboard`, `/users`, `/items`, `/leads`, `/prospects`, `/customers`, `/quotations`, `/followups`, `/reports`, `/audit-logs`, `/announcements`, `/notifications`, `/settings`, `/help`, and `/profile`.
- Platform routes: `/platform/organizations`, `/platform/signup-requests`, `/platform/settings`, `/platform/billing`, and nested `/platform/organizations/:slug/*` tenant workspace routes.
- Legacy redirects remain for old `/:orgSlug/*`, `/super-admin/*`, and `/admin/*` URLs.

Route access is driven by role arrays in `src/constants/roles.ts`. `ProtectedRoute` only checks that a user exists. `RoleGuard` handles role-level redirects.

## Data Flow

```text
View component
  -> feature hook
  -> feature API service
  -> src/lib/api/client.ts
  -> src/lib/api/interceptors.ts
  -> backend /api/v1
  -> TanStack Query cache
```

Feature views should call hooks, not Axios directly. Services own endpoint calls and response unwrapping. Hooks own cache keys, mutation invalidation, and API toasts.

## Auth And Tenant Context

- `bootstrapAuth` tries `/auth/refresh` when no in-memory access token exists, then calls `/auth/me`.
- Access tokens are kept in module memory through `src/lib/api/tokenStore.ts`.
- The refresh token is an HTTP-only `refresh_token` cookie scoped to `/api/v1/auth`.
- The request interceptor sends `Authorization: Bearer <accessToken>` when present.
- Write requests get `x-requested-with: XMLHttpRequest` for CSRF protection.
- Super admin tenant workspace requests get `x-organization-id` from `auth.selectedOrganizationId`.

## Where To Add Things

| Change | Add it in |
| --- | --- |
| Route screen | `src/pages/<Name>Page.tsx` plus `features/<feature>/components/view/*` |
| API path constants | `features/<feature>/api/endpoints.ts` |
| API call implementation | `features/<feature>/api/services.ts` |
| Server state hook | `features/<feature>/hooks/*` |
| Shared list/search/filter behavior | `src/hooks/useListView.ts`, `src/hooks/useFilters.ts`, table components |
| Feature-only form/table/detail UI | `features/<feature>/components/*` |
| Shared primitive or app shell UI | `src/components/ui/*`, `src/components/common/*`, `src/components/layout/*` |
| Backend-aligned DTO/schema | `src/contracts/types/*`, `src/contracts/validation/*` |
