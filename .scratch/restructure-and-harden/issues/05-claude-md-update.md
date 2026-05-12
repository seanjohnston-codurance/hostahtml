# 05 — Update CLAUDE.md to reflect the new state

Status: needs-info

Depends on: issues 01–04 must land first. This is intentionally last so the conventions captured reflect what was actually built.

## Motivation

The existing repo-root `CLAUDE.md` is a thin pointer to `docs/agents/*` (issue tracker, triage labels, domain docs). After issues 01–04 the repo has new conventions worth recording inline: Svelte 5 runes, TDD workflow, static SvelteKit routing, workspaces layout, api file responsibilities, JWKS verification rule, decoded-body validation, build-output requirement.

## Scope

Update `CLAUDE.md` **in place** — append a new top section describing the project workspaces and conventions. **Do not remove** the existing `## Agent skills` section.

Add an `AGENTS.md` symlink → `CLAUDE.md` at the repo root for tooling that looks for the agnostic name:

```bash
ln -s CLAUDE.md AGENTS.md
```

### Content to add (above `## Agent skills`)

````markdown
# hostahtml

Internal Codurance tool for sharing HTML files. Workspaces:
- `frontend/` — Svelte 5 + static SvelteKit 2, deployed to S3 + CloudFront
- `api/` — AWS Lambda handler for upload + auth
- `shared/` — TypeScript types shared between `frontend` and `api`
- `infra/` — AWS CDK stack

Use `npm` workspaces. Run commands from the workspace root unless noted.

## Frontend (`frontend/`)

- **Svelte 5** with runes only. `$state`, `$props`, `$effect`. Never `export let`.
- **SvelteKit 2** + `@sveltejs/adapter-static`. Prerender `/` at build time (`prerender: true`) and emit `200.html` as the fallback for future client-routed deep links. No runtime SSR server.
- Build output: `dist/` (matched by `.github/workflows/deploy.yml`).
- Components in `src/lib/components/` with colocated `*.test.ts`.
- Page in `src/routes/+page.svelte` owns state; components are presentational.
- Imports shared types from `@hostahtml/shared`.

### Testing — TDD
Vitest + `@testing-library/svelte` v5 + jsdom. Red → green → refactor. `Foo.svelte` ↔ `Foo.test.ts`. Test behaviour through the DOM.

### Commands
- `npm run dev|test|check|build -w frontend`

## API (`api/`)

- AWS Lambda (Node 20), bundled by CDK's `NodejsFunction`.
- `handler.ts` dispatches only; `auth.ts`, `validate.ts`, `upload.ts` hold logic.
- **JWT:** `google-auth-library`'s `OAuth2Client.verifyIdToken` (caches JWKS in module scope). Never call `tokeninfo`.
- **Validation:** decode API Gateway bodies using `isBase64Encoded`; reject decoded bytes > 5 MB; reject if first 1 KB lacks `<html` / `<!doctype` / `<body>`.
- Imports shared response types from `@hostahtml/shared`.

### Testing
Vitest, red-first. Mock S3 + `google-auth-library` at the module boundary. `Foo.ts` ↔ `Foo.test.ts`.

### Commands
- `npm run test -w api`

## Shared (`shared/`)

- Type-only package (`@hostahtml/shared`). No runtime code.
- Bumping a type is a breaking change for both consumers — keep the surface small.

## Infra (`infra/`)

- AWS CDK v2. Resource definitions only.
- Bucket has a 7-day lifecycle rule matching the presigned URL expiry (ADR-0003).
- API Gateway HTTP API v2 has stage-level route throttle (5 req/s sustained, 10 burst). Per-user limits deferred (ADR-0002).
- CloudFront maps 403/404 to `/200.html`; this must match the SvelteKit adapter-static fallback.
- Lambda entry: `../api/src/handler.ts`. Env: `BUCKET_NAME`, `GOOGLE_CLIENT_ID`.

### Commands
- `cd infra && npx cdk diff` / `cdk deploy`

---
````

(The existing `## Agent skills` section continues below.)

## Acceptance

- [ ] `grep -q '^# hostahtml' CLAUDE.md` — new top section present.
- [ ] `grep -q '^## Agent skills' CLAUDE.md` — existing section preserved.
- [ ] `ls -l AGENTS.md` shows it's a symlink → `CLAUDE.md`.
- [ ] `readlink AGENTS.md` → `CLAUDE.md`.

## Comments
