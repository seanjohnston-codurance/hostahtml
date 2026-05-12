# 02 — npm workspaces + relocate Lambda (no behaviour change)

Status: done

Depends on: nothing (independent of issue 01).
Blocks: issue 03 (api hardening lands in the new location).

## Motivation

Lambda code lives under `infra/lambda/`, which conflates application code with infrastructure definitions. Promoting it to a peer workspace (`api/`) makes it testable and reusable. While restructuring, also introduce `shared/` for cross-package types — there's currently one shared shape (`UploadResponse`) duplicated between frontend and Lambda, with more coming.

This issue is deliberately mechanical: relocate, set up workspaces, **no logic edits**. The file split + hardening lives in issue 03 so reviewers can confirm "this is a pure move" in one diff.

## Scope

### Workspaces

- Add root `package.json`:
  ```json
  { "name": "hostahtml", "private": true, "workspaces": ["frontend", "api", "shared", "infra"] }
  ```
- `npm install` at the root resolves cross-workspace deps via symlinks.

### `shared/` workspace

- `shared/package.json` → name `@hostahtml/shared`, `main: src/index.ts`, `types: src/index.ts`.
- `shared/src/api.ts`:
  ```ts
  export type UploadResponse = { url: string; key: string; expiresInDays: number };
  export type ErrorResponse = { error: string };
  ```
- `shared/src/index.ts` re-exports from `./api`.
- Frontend and api import types only: `import type { UploadResponse } from '@hostahtml/shared'`.

### Relocate Lambda

1. Move `infra/lambda/handler.ts` → `api/src/handler.ts` — **byte-identical contents**.
2. Create `api/package.json` with just the deps needed for the existing handler (no `google-auth-library` yet — that lands in issue 03):
   - deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@hostahtml/shared`
   - devDeps: `@types/aws-lambda`, `vitest`, `typescript`
3. Update `infra/lib/hostahtml-stack.ts` `NodejsFunction` `entry` from `infra/lambda/handler.ts` → `../api/src/handler.ts`.
4. Delete `infra/lambda/` entirely.
5. Update `.github/workflows/deploy.yml` if it references the old Lambda path.

## Out of scope

- File split (handler/auth/upload/validate) — issue 03.
- JWKS auth, size validation, content sniff — issue 03.
- S3 lifecycle, API GW throttle — issue 04.

## Acceptance

- [ ] `npm install` at repo root succeeds.
- [ ] `ls api/src/handler.ts` exists; `diff` against the old `infra/lambda/handler.ts` (from git history) shows zero changes.
- [ ] `ls infra/lambda/` returns non-zero (deleted).
- [ ] `cd infra && npx cdk diff` shows no resource topology or configuration changes. A Lambda code asset/hash diff is acceptable because the source path moved.
- [ ] Deployed Lambda still serves upload requests correctly (manual smoke test).

## Comments
