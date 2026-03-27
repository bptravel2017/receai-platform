# ReceAI v2 Project Rules

This repository is the clean restart for ReceAI v2.

## Guardrails

- Do not copy application code from the legacy v1 implementation into v2.
- Build from clean primitives and re-implement behavior intentionally.
- Keep business logic, billing rules, and data workflows out of scaffold-only changes.
- Prefer small, modular files under `src/modules`, `src/lib`, and `src/app`.
- Keep route handlers thin and move integration code into `src/lib` or module-specific services later.
- Treat Supabase and Stripe as external boundaries. Keep configuration isolated and typed.
- Add tests alongside new business logic when feature implementation begins.

## Current Scope

- Public route skeletons
- Auth route skeletons
- App/dashboard route skeletons
- Placeholder API endpoints for future billing/webhook work
- Environment and integration placeholders only

## Non-Goals For The Scaffold Phase

- No production business logic
- No data migration from v1
- No UI polish beyond basic shell structure
- No schema design beyond empty placeholders

## Suggested Conventions

- Public marketing routes live in `src/app/(public)`.
- Auth routes live in `src/app/(auth)`.
- Signed-in product routes live in `src/app/(app)`.
- Module-specific code belongs in `src/modules/<module-name>`.
- Shared integration code belongs in `src/lib`.
- Shared presentational primitives belong in `src/components`.
