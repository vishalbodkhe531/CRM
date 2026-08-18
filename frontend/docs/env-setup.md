# Environment Setup

## Prerequisites

- Node.js 20 or newer.
- npm.
- Backend running locally when testing API-backed screens.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Production yes, development optional | Full backend API base URL including `/api/v1` |

Development fallback in `src/lib/api/client.ts`:

```ts
const DEV_FALLBACK_API_BASE_URL = "http://localhost:5000/api/v1";
```

Example override:

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Only variables prefixed with `VITE_` are exposed to frontend code.

## Endpoint Rule

Feature endpoint constants are relative to the API base URL.

```ts
// Correct
export const USER_ENDPOINTS = {
  LIST: "/users",
};

// Incorrect
export const USER_ENDPOINTS = {
  LIST: "/api/v1/users",
};
```

## Verification

1. Start the backend on port `5000`.
2. Start the frontend on port `5173`.
3. Open the app and confirm the login page renders.
4. Log in and confirm `/auth/login`, `/auth/me`, and feature API calls target the configured base URL.

## Common Issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Missing VITE_API_BASE_URL` in production | No production env var set | Set `VITE_API_BASE_URL` during build/deploy |
| API `Network Error` | Backend not running or wrong base URL | Check backend port and `VITE_API_BASE_URL` |
| Cookies not sent on refresh/logout | Missing credentials/CORS setup | Keep Axios `withCredentials: true` and backend CORS `credentials: true` |
| 403 CSRF on writes | Missing write header | Use shared Axios client so interceptor adds `x-requested-with` |
