---
description: test
---

1. Ask me: "Which module or feature would you like to test — backend or frontend?"
2. If Backend: Read the .service.ts file, identify all functions.
   Write Vitest unit tests with Prisma mocked.
   Every test MUST cover:
   - Happy path
   - Wrong orgId → empty result or AppError.forbidden
   - Missing required fields → AppError.validation
   - Prisma mock returns expected shape
3. If Frontend: Read the slice.ts and selectors.ts files.
   Write tests mocking src/lib/api.ts.
   Every test MUST cover:
   - Fulfilled action → correct state shape
   - Rejected action → error state set correctly
   - Selector returns derived data correctly
4. Show me the test plan first, wait for my approval before writing any code.