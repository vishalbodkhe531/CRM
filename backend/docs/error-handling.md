# Error Handling

## Central Pattern

- Route handlers are wrapped with `asyncHandler`.
- Controllers and services throw `AppError` or allow Prisma/Zod errors to bubble.
- `errorHandler` converts every error into one JSON shape.
- Security and billing denials are also written to the audit trail when mapped.

## Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "code": 400,
  "errorCode": "VALIDATION_ERROR",
  "details": []
}
```

Frontend mapping depends on these fields:

| Backend field | Frontend field |
| --- | --- |
| `error` | `message` |
| `code` | `status` |
| `errorCode` | `code` |
| `details` | `details` |

## Building Blocks

| File | Role |
| --- | --- |
| `src/types/error.types.ts` | `ApiError` class and status re-export |
| `src/utils/errors/appError.ts` | Error factory by domain |
| `src/middlewares/errorHandler.ts` | Global formatter/logger/audit hook |
| `src/middlewares/validationMiddleware.ts` | Zod request parser |
| `src/constants/error-codes.constants.ts` | Client-facing error code constants |

## AppError Domains

- `authentication`: invalid credentials, expired token, disabled user, email exists.
- `authorization`: forbidden, role required, suspended organization.
- `validation`: bad request, required field, invalid format.
- `resource`: not found, conflict, already exists.
- `database`: database error, constraint violation, connection error.
- `business`: rule violation, invalid operation, state conflict.
- `billing`: subscription required, seat/limit reached, feature not available.
- `system`: internal error, unavailable, too many requests.

## Prisma Mapping

| Prisma code | HTTP | Error code |
| --- | --- | --- |
| `P2002` unique constraint | `409` | `DATABASE_CONSTRAINT_VIOLATION` |
| `P2025` record not found | `404` | `RESOURCE_NOT_FOUND` |
| `P2003` foreign key | `400` | `DATABASE_CONSTRAINT_VIOLATION` |
| `P2004` constraint violation | `400` | `DATABASE_CONSTRAINT_VIOLATION` |
| `P1008` connection timeout | `503` | `DATABASE_CONNECTION_ERROR` |
| default Prisma known error | `500` | `DATABASE_ERROR` |

## Denial Audit

`errorHandler` records selected blocked requests with `recordAudit`:

| Error code | Audit action |
| --- | --- |
| `ORG_FORBIDDEN` | `PERMISSION_DENIED` |
| `SUBSCRIPTION_REQUIRED` | `SUBSCRIPTION_BLOCKED` |
| `FEATURE_NOT_AVAILABLE` | `SUBSCRIPTION_BLOCKED` |
| `SEAT_LIMIT_REACHED` | `QUOTA_EXCEEDED` |
| `LIMIT_REACHED` | `QUOTA_EXCEEDED` |

Generic validation and not-found errors are intentionally not audited.

## Logging

- 4xx errors log as warnings.
- 5xx errors log as errors.
- Logs include timestamp, method, path, status code, error name, message, stack, details, and user id when available.
- Stack traces are included in API responses only in non-production and only for 5xx errors.
