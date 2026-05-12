# hostahtml

Internal Codurance tool for sharing HTML files. Workspaces:
- `frontend/` — Svelte 5 + static SvelteKit 2, deployed to S3 + CloudFront
- `api/` — AWS Lambda handler for upload + auth
- `shared/` — TypeScript types shared between `frontend` and `api`
- `infra/` — AWS CDK stack

Use `npm` workspaces. Run commands from the workspace root unless noted.

## Agent workflow

- **TDD:** Use `/tdd` for feature work and bug fixes unless the user says otherwise. Follow red → green → refactor and vertical slices; match the Testing sections below for each workspace.
- **MCP:** Prefer enabled MCP servers when they apply. For Svelte, SvelteKit, or frontend behaviour, use the **Svelte MCP** server: read each tool’s schema before calling, and use it to confirm docs and fixes after substantive Svelte changes when that server’s instructions say to.

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
- `npm run test|check -w api`

## Shared (`shared/`)

- Type-only package (`@hostahtml/shared`). No runtime code.
- Bumping a type is a breaking change for both consumers — keep the surface small.

## Infra (`infra/`)

- AWS CDK v2. Resource definitions only.
- Bucket has a 7-day lifecycle rule matching the presigned URL expiry (ADR-0003).
- API Gateway HTTP API v2 has stage-level route throttle (5 req/s sustained, 10 burst). Per-user limits deferred (ADR-0002).
- CloudFront maps 403/404 to `/200.html`; this must match the SvelteKit adapter-static fallback.
- Lambda entry: `../api/src/handler.ts`. Env: `BUCKET_NAME`, `GOOGLE_CLIENT_ID`, optional `STRICT_HTML_SNIFF`. Google identity must be Codurance (`hd` or `@codurance.com` email); see `api/src/orgPolicy.ts`. Frontend GSI passes `hd` (same domain) in `+page.svelte`.

### Commands
- `cd infra && npx cdk diff` / `cdk deploy`

---

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default five-label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
