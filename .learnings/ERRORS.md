# Errors

- `npx tsc --noEmit` fails in the existing backend tree because `@/lib/saas-service` is imported by `src/app/api/customers/route.ts`, `src/app/api/revenue/route.ts`, `src/app/api/invoices/route.ts`, and `src/lib/saas-http.ts`, but `src/lib/saas-service.ts` is not present in the workspace.
- The Daytime UI slice itself type-checks; the failure is repo-wide and outside the frontend files I was allowed to edit.
- Resolution on 2026-03-22: restored and hardened the backend service layer, then reran `npx tsc --noEmit` successfully.
