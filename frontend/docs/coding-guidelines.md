# Coding Guidelines

## TypeScript

- Prefer inferred types from Zod schemas and shared contracts.
- Avoid `any`. Use `unknown` plus guards when the shape is not known.
- Avoid unsafe casts. If a cast is unavoidable, keep it local and explain the boundary.
- Put feature-specific types in `features/<feature>/types/*`.
- Put backend-aligned DTOs and constants in `src/contracts/*`.
- Put app-wide structural types in `src/types/*`.

```ts
export const CreateItemSchema = z.object({
  name: z.string().min(2),
  itemType: z.enum(["GOODS", "SERVICE"]),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
```

## Imports

Use the `@/` alias inside `frontend/src`.

```ts
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
```

Avoid long relative imports across feature boundaries.

## API Discipline

- Add endpoint constants in `features/<feature>/api/endpoints.ts`.
- Keep `/api/v1` in `VITE_API_BASE_URL`, not endpoint constants.
- Use the shared Axios instance from `@/lib/api/client`.
- Use `createApiService` for standard JSON endpoints.
- Unwrap response data in services or hooks before it reaches presentational components.
- Normalize API errors only through `extractApiError`.

## TanStack Query

- Use `useQuery` for reads and `useMutation` for writes.
- Use `queryKeys` from `src/lib/queryKeys.ts`.
- Include params and selected organization context in keys when they affect results.
- Use `keepPreviousData` for paginated lists when the UX benefits.
- Invalidate the narrowest practical key after successful mutations.
- Do not mirror server collections into Redux or local state.

## Redux

Redux is reserved for auth and synchronous app context:

- Current user.
- Loading/error state for auth thunks.
- Selected organization id for super-admin tenant workspaces.

Do not add feature slices for leads, items, users, billing, or other server-backed modules.

## Naming

| Item | Convention | Example |
| --- | --- | --- |
| Component | `PascalCase.tsx` | `LeadDetail.tsx` |
| Hook | `useXxx.ts` | `useLeads.ts` |
| Endpoint file | `endpoints.ts` | `features/items/api/endpoints.ts` |
| Service file | `services.ts` or local existing name | `prospectsService.ts` |
| Schema file | `*.schema.ts` | `createLead.schema.ts` |
| Constants file | plural or domain name | `filters.ts`, `options.ts` |
| Barrel | `index.ts` | `features/users/index.ts` |

Follow the existing feature naming if it differs.

## Pre-PR Checklist

- `npm run lint` passes.
- `npm run build` passes.
- New API calls use endpoint constants and shared client.
- New server-state reads/writes use TanStack Query.
- Auth behavior remains in `features/auth/store/*`.
- Loading, empty, error, and pending states are handled.
- No raw `fetch()`, duplicate Axios clients, or hardcoded full API URLs.
- No secrets, tokens, or passwords are logged.
