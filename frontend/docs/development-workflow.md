# Development Workflow

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Vite runs on `http://localhost:5173`. The backend default is `http://localhost:5000/api/v1`.

## Environment

Create `frontend/.env.development` only if you need to override the dev fallback:

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

In production, `VITE_API_BASE_URL` is required.

## Feature Delivery Order

1. Confirm backend contract or add/update `src/contracts/*`.
2. Add endpoint constants in `features/<feature>/api/endpoints.ts`.
3. Implement service calls in `features/<feature>/api/services.ts`.
4. Add or update query/mutation hooks in `features/<feature>/hooks/*`.
5. Build feature UI in `features/<feature>/components/*`.
6. Add a thin page wrapper in `src/pages/*` if a new route is needed.
7. Register the route and role guard in `AppRoutes.tsx`.
8. Update docs when API, auth, routing, or folder conventions change.

## Commands

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` runs `tsc -b` and `vite build`.

## Commit Style

Use Conventional Commits:

```bash
feat: add billing usage view
fix: correct quotation query invalidation
docs: update frontend auth flow
chore: update dependencies
```

## PR Checklist

- `npm run lint` passes.
- `npm run build` passes.
- API calls use shared client and endpoint constants.
- Query keys use `src/lib/queryKeys.ts`.
- Mutations invalidate relevant queries.
- Loading, empty, error, and pending states are covered.
- Role guard and sidebar changes are aligned for new routes.
- Docs are updated for changed contracts or workflows.
