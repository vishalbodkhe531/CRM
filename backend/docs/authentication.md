# Authentication

## Strategy

The backend uses JWT access tokens plus a rotated HTTP-only refresh cookie.

- Access token: returned in JSON and expected on protected requests as `Authorization: Bearer <token>`.
- Refresh token: stored in `refresh_token`, an HTTP-only cookie scoped to `/api/v1/auth`.
- Refresh token storage: SHA-256 hash in the `RefreshToken` table.
- Default expiries: access `15m`, refresh `7d` unless overridden by env.

There is no access-token cookie in the current auth middleware.

## Cookie Contract

```ts
res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
});
```

The frontend must call refresh and logout with credentials enabled.

## JWT Payload

```ts
{
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  organizationPrefix?: string;
  nonce?: string;
  iat?: number;
  exp?: number;
}
```

`nonce` is added during refresh so rotated access tokens are unique.

## Auth Routes

| Route | Purpose |
| --- | --- |
| `POST /api/v1/auth/signup` | Self-service signup, creates organization/admin/subscription |
| `POST /api/v1/auth/login` | Login, returns `{ user, accessToken }`, sets refresh cookie |
| `POST /api/v1/auth/refresh` | Rotates refresh token and returns a new access token |
| `POST /api/v1/auth/logout` | Deletes the current refresh token and clears cookie |
| `GET /api/v1/auth/me` | Returns current user from Bearer access token |
| `PATCH /api/v1/auth/profile` | Updates profile and optional uploaded assets |
| `POST /api/v1/auth/change-password` | Changes password, revokes sessions, clears cookie |

## `requireAuth`

`requireAuth` in `src/middlewares/auth.middleware.ts`:

1. Reads the `Authorization` header.
2. Requires `Bearer <token>` format.
3. Verifies the access token with `JWT_SECRET`.
4. Fetches the user from the database.
5. Blocks inactive users.
6. Blocks users whose organization is not `ACTIVE`.
7. Rejects tokens issued before `passwordChangedAt`.
8. Attaches the user to `req.user`.

## Refresh Rotation

`authService.refresh`:

1. Reads the `refresh_token` cookie.
2. Verifies it with `JWT_REFRESH_SECRET`.
3. Hashes the incoming token and looks up `RefreshToken`.
4. Allows one reuse inside a 30-second grace window for multi-tab refresh.
5. Treats a second reuse after rotation as replay and deletes all user refresh tokens.
6. Creates a new hashed refresh token row.
7. Marks the old token as replaced.
8. Returns a new access token and sets a new refresh cookie.

## CSRF

CSRF applies to state-changing methods. Login and health are exempt. Refresh and logout are not exempt because they use cookies.

Expected frontend write header:

```bash
x-requested-with: XMLHttpRequest
```

## Rate Limits

| Limiter | Routes | Limit |
| --- | --- | --- |
| `authLimiter` | login, signup, signup requests | 5 requests per 5 minutes |
| `refreshLimiter` | refresh | 10 requests per 5 minutes |
| `passwordResetLimiter` | user password reset | 3 requests per hour |
| `apiLimiter` | general API after internal routes | 500 requests per 15 minutes |

## Frontend Coupling

The frontend interceptor must:

- Store access tokens only in memory.
- Send `Authorization: Bearer <accessToken>`.
- Send `x-requested-with` for writes.
- Call `/auth/refresh` with `withCredentials: true`.
- Clear auth state if refresh fails.
