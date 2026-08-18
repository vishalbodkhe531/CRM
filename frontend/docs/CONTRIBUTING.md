# Contributing

## Overview

The frontend is a feature-first React SPA for CRM workflows. Server state belongs to TanStack Query, auth belongs to Redux, and all HTTP goes through the shared Axios client.

Current stack:

- React 19, TypeScript, Vite 7.
- React Router 7.
- TanStack Query v5 and React Query Devtools.
- Redux Toolkit for auth only.
- Axios, Zod, React Hook Form.
- Tailwind CSS v4 and Radix-style UI primitives.

## Read First

1. `env-setup.md`
2. `architecture.md`
3. `folder-structure.md`
4. `architecture-api-layer.md`
5. `frontend-auth.md`
6. `state-management.md`
7. `component-guidelines.md`
8. `error-handling.md`
9. `coding-guidelines.md`
10. `development-workflow.md`

## Rules To Keep In Mind

1. Pages stay thin and render feature views.
2. Feature modules own their API services, hooks, and domain UI.
3. Auth is the only Redux slice.
4. Use `queryKeys` for every TanStack Query key.
5. Use `@/lib/api/client` and endpoint constants for API calls.
6. Do not store tokens in browser storage.
7. Use shared contracts and Zod schemas instead of ad hoc form types.
8. Update docs when routes, auth, API contracts, state conventions, or folder structure change.

## Before Opening A PR

```bash
npm run lint
npm run build
```

Also verify the changed workflow in the browser, including loading, empty, error, and mutation states.

## PR Template

```md
## What changed

## Why

## How to test

## Screenshots
```

Use Conventional Commits such as `feat:`, `fix:`, `docs:`, `refactor:`, and `chore:`.
