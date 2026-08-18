# Folder Structure

## Current `src` Roots

```text
frontend/src/
|-- app/
|-- assets/
|-- components/
|-- constants/
|-- contracts/
|-- docs/
|-- features/
|-- hooks/
|-- lib/
|-- pages/
|-- types/
`-- utils/
```

## Important Folders

```text
app/
|-- providers.tsx
|-- queryClient.ts
|-- toastListenerMiddleware.ts
`-- store/
    |-- index.ts
    `-- types.ts

components/
|-- common/
|-- guards/
|-- layout/
|-- routing/
`-- ui/

lib/
|-- queryKeys.ts
`-- api/
    |-- auth.ts
    |-- client.ts
    |-- interceptors.ts
    |-- service.utils.ts
    `-- tokenStore.ts
```

## Feature Modules

Current feature folders:

```text
features/
|-- announcements/
|-- audit/
|-- auth/
|-- billing/
|-- customers/
|-- dashboard/
|-- help/
|-- items/
|-- leads/
|-- notifications/
|-- organizations/
|-- platformSettings/
|-- prospects/
|-- quotations/
|-- reports/
|-- signupRequests/
`-- users/
```

Common feature shape:

```text
features/<feature>/
|-- api/
|   |-- endpoints.ts
|   `-- services.ts
|-- components/
|   |-- view/
|   |-- forms/
|   |-- table/
|   |-- details/
|   `-- shared/
|-- constants/
|-- hooks/
|-- types/
|-- validators/
`-- index.ts
```

Not every feature has every folder. Follow the local pattern already present.

## Auth Feature Shape

```text
features/auth/
|-- api/
|   |-- endpoints.ts
|   `-- services.ts
|-- components/
|   |-- forms/
|   `-- view/
|-- hooks/
|   |-- useAuth.ts
|   |-- useAuthBootstrap.ts
|   `-- usePermissions.ts
|-- store/
|   |-- selectors.ts
|   `-- slice.ts
|-- types/
`-- index.ts
```

Auth is the only feature with a `store` folder.

## Contracts

```text
contracts/
|-- constants/
|-- dashboard/
|-- types/
`-- validation/
```

These mirror backend contracts and should stay aligned with backend API changes.

## Placement Rules

| Question | Location |
| --- | --- |
| Used by multiple features? | `components/common/*` |
| Base UI primitive? | `components/ui/*` |
| Feature-only UI? | `features/<feature>/components/*` |
| Feature API call? | `features/<feature>/api/*` |
| Feature server-state hook? | `features/<feature>/hooks/*` |
| Cross-feature UI hook? | `src/hooks/*` |
| Global utility? | `src/utils/*` |
| Backend DTO/schema/constant? | `src/contracts/*` |
| Thin route wrapper? | `src/pages/*` |
