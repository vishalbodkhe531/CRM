# Backend Coding Guidelines

## Layer Boundaries

| Layer | Do |
| --- | --- |
| Route | Declare path, middleware, validation order |
| Controller | Read `req`, call service, return `ApiResponse`, record audit when appropriate |
| Service | Enforce business rules, authorization nuances, tenant ownership, transactions |
| Repository | Prisma queries only |
| Contracts | Zod schemas, shared constants, DTO types |

Do not put Prisma calls in controllers. Do not put HTTP response logic in services.

## Type Safety

- Avoid `any`; prefer Zod-inferred input types and shared contract types.
- Parse request bodies and queries with schemas from `src/contracts/validation`.
- Guard unknown values with utilities in `src/utils/validation`.
- Keep backend-only request/user/error types in `src/types`.

## API Responses

Use the response envelope:

```ts
return ApiResponse.ok(res, data, "Message");
return ApiResponse.created(res, data, "Created");
```

Do not return raw JSON from normal API controllers:

```ts
// Avoid
return res.json(data);
```

CSV/export endpoints may write directly to the response when the content type is not JSON.

## Errors

- Throw `AppError` for expected auth, authorization, validation, business, billing, and resource failures.
- Let Zod and Prisma errors reach `errorHandler`.
- Do not hand-build error JSON in controllers or services.
- Add a new `ERROR_CODES` value when the frontend needs programmatic behavior.

## Middleware Order

For tenant data modules, use this order:

```ts
router.use(requireAuth);
router.use(requireOrganization);
router.use(enforceSubscription);
```

Then apply route-level permissions and validation:

```ts
router.patch(
  "/:id",
  allowPermission(PERMISSIONS.ITEM_UPDATE),
  validateData(UpdateItemSchema),
  itemController.updateItem,
);
```

For multipart routes, multer must run before Zod validation so `req.body` is populated.

## Tenant Safety

- Use `req.organizationId` as the tenant source for scoped services.
- Never trust `organizationId` from body or query for tenant data.
- Super admin scoping is explicit through `x-organization-id`.
- Platform routes that skip `requireOrganization` must enforce visibility in service code.
- Reads and writes should both filter by tenant where applicable.

## Transactions And Concurrency

- Use transactions for multi-row writes.
- Keep sequence generation database-safe.
- Use audit logs for important security, billing, and lifecycle events.
- Never log passwords, tokens, refresh-token hashes, or generated temporary passwords.

## Uploads

- Use configured multer helpers from `src/config/multerConfig.ts`.
- Persist public upload paths, not local disk paths.
- Let `cleanupUploadsOnError` remove files from failed requests.
- Delete replaced assets only after successful database commits.

## Verification

Before merging backend changes:

```bash
npm run build
npm run verify
```

Also update docs when routes, schemas, auth behavior, Prisma models, or middleware order changes.
