# Frontend Authentication

The frontend uses a hybrid JWT session:

- Access token: returned in JSON, stored only in module memory by `src/lib/api/tokenStore.ts`.
- Refresh token: HTTP-only `refresh_token` cookie scoped to `/api/v1/auth`.
- Auth state: Redux auth slice in `features/auth/store/slice.ts`.
- Protected requests: `Authorization: Bearer <accessToken>` header.

No token is stored in `localStorage` or `sessionStorage`.

## Login Flow

1. Login form dispatches the `login` thunk.
2. `authService.login` posts to `/auth/login`.
3. Backend returns `{ user, accessToken }` and sets the `refresh_token` cookie.
4. Frontend stores the access token in memory.
5. Redux stores the authenticated `user`.
6. Route guards allow protected routes.

## Bootstrap Flow

`useAuthBootstrap` runs once when `App` mounts.

1. If an access token is already in memory, call `/auth/me`.
2. If no access token exists, call `/auth/refresh`.
3. Store the new access token from refresh.
4. Call `/auth/me` and store the returned user.
5. If refresh or `/me` fails, clear local auth state.

This makes browser reloads work because the refresh cookie survives while the in-memory access token does not.

## Request Interceptor

The request interceptor:

- Adds `Authorization: Bearer <accessToken>` when present.
- Adds `x-requested-with: XMLHttpRequest` for writes.
- Adds `x-organization-id` only for super admin when `selectedOrganizationId` is set.

Do not set these headers manually in feature code.

## Refresh And Retry

When a request fails with `401`:

1. The interceptor skips login and refresh requests.
2. If another refresh is running, the request waits in a queue.
3. Otherwise it posts to `/auth/refresh` with credentials and CSRF header.
4. On success, the new access token is stored and the original request is retried.
5. On failure, `clearAuth` runs and the user is redirected to `/`.

Refresh coordination uses `BroadcastChannel("auth_sync")` so tabs share refresh/logout events.

## Logout And Password Change

- `logout` posts to `/auth/logout`, then clears Redux and the in-memory access token.
- `changePassword` posts to `/auth/change-password`; backend revokes refresh tokens, clears the cookie, and frontend clears the local user.

## Route Guards

- `AuthEntryRoute` renders login at `/` or redirects authenticated users to the default authenticated path.
- `ProtectedRoute` requires `state.auth.user`.
- `RoleGuard` checks the route role arrays in `src/constants/roles.ts`.
- Legacy org-slug and platform route aliases redirect inside `AppRoutes`.

## Session Model

```text
Session = in-memory access token + HTTP-only refresh cookie + CSRF write header + tenant scope header
```

Tenant scope matters only for super-admin workspace views. Normal users are scoped by the backend from their authenticated user.
