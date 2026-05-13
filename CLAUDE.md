# hostahtml

Internal Codurance tool for sharing HTML files. Workspaces:
- `frontend/` — Svelte 5 + static SvelteKit 2, deployed to S3 + CloudFront
- `api/` — AWS Lambda handler for upload + auth
- `shared/` — TypeScript types shared between `frontend` and `api`
- `infra/` — AWS CDK stack

Use `npm` workspaces. Run commands from the workspace root unless noted.

## Root scripts

Run from the repo root. `infra:*` scripts (except `destroy`) need `GOOGLE_CLIENT_ID` exported in the shell — they forward it as CDK context so the Lambda env is set correctly.

- `npm run dev` — SvelteKit dev server (Vite + HMR) for `frontend/`.
- `npm run infra:synth` — `cdk synth` in `infra/`. Compiles the CDK app to a CloudFormation template under `infra/cdk.out/`. Read-only.
- `npm run infra:diff` — `cdk diff` in `infra/`. Compares synthesized template against the deployed stack. Read-only; always run before `infra:deploy`.
- `npm run infra:deploy` — `cdk deploy --require-approval never` in `infra/`. Pushes the stack to AWS (S3, Lambda, API Gateway, CloudFront, IAM).
- `npm run infra:destroy` — `cdk destroy` in `infra/`. S3 buckets have `RemovalPolicy.RETAIN`, so they survive destroy and must be emptied/deleted by hand if you really want them gone.

## Agent workflow

- **TDD:** Use `/tdd` for feature work and bug fixes unless the user says otherwise. Follow red → green → refactor and vertical slices; match the Testing sections below for each workspace.
- **Changelog:** When implementing features, bug fixes, or behaviour changes that users can observe, update `CHANGELOG.md` with a dated, user-friendly note. Skip changelog entries for purely internal refactors, tests, agent guidance, or tooling changes unless they affect user-visible behaviour.
- **MCP:** Prefer enabled MCP servers when they apply. For Svelte, SvelteKit, or frontend behaviour, use the **Svelte MCP** server: read each tool’s schema before calling, and use it to confirm docs and fixes after substantive Svelte changes when that server’s instructions say to.
- **Testing philosophy:** Prefer fast, deterministic tests that observe public behaviour and stable contracts. Use the narrowest test that gives confidence: many focused tests for pure logic and validators, a smaller number of public-entrypoint vertical-slice tests when the slice is cheap, and very few tests that need real infrastructure, real browsers, or real provider services.
- **Mocks:** Prefer real collaborators, pure functions, in-memory fakes, and deterministic builders over mocks. Use mocks mainly for hard boundaries such as AWS SDK clients, Google auth, browser APIs, time, randomness, and network I/O; keep boundary mocks thin and contract-focused.
- **Property-based testing:** Prefer property-based tests for parsers, validators, token/signature logic, encoding/decoding, routing or dispatch tables, permission rules, and other invariant-heavy behaviour. Use example-based tests for workflows, rendering, and named edge cases.
- **Test hygiene:** Test observable behaviour rather than implementation details. During TDD, temporary tests against internals are acceptable when they help triangulate a design or force out a tricky branch, but delete or rewrite them before finishing unless the internal has become an intentional stable contract. Deleting low-value tests is part of keeping the suite healthy.
- **Regression tests:** For bug fixes, start with a failing regression test that reproduces the user-visible or contract-level failure. Only skip it when reproduction is impractical; then explain the gap and cover the closest stable behaviour.
- **Test data:** Prefer small named builders or factory functions over inline object blobs. Keep generated data realistic enough to preserve domain constraints, and make important edge cases explicit in the test name or assertion.
- **Avoid low-value tests:** Do not add tests that only assert framework behaviour, TypeScript types already enforced by `check`, or trivial wiring with no meaningful branch. Avoid broad snapshots by default; use snapshots or golden files only when serialized output is the contract and failures will be reviewable.
- **Determinism:** Avoid sleeps, real timers, real randomness, and dependence on wall-clock time. Inject clocks/randomness or use controlled test utilities when behaviour depends on time, IDs, expiry, ordering, retry, or generated inputs.

## Frontend (`frontend/`)

- **Svelte 5** with runes only. `$state`, `$props`, `$effect`. Never `export let`.
- **SvelteKit 2** + `@sveltejs/adapter-static`. Prerender `/` at build time (`prerender: true`) and emit `200.html` as the fallback for future client-routed deep links. No runtime SSR server.
- Build output: `dist/` (matched by `.github/workflows/deploy.yml`).
- Components in `src/lib/components/` with colocated `*.test.ts`.
- Page in `src/routes/+page.svelte` owns state; components are presentational.
- Imports shared types from `@hostahtml/shared`.

### Testing — TDD
Vitest + `@testing-library/svelte` v5 + jsdom. Red → green → refactor. `Foo.svelte` ↔ `Foo.test.ts`. Test behaviour through the DOM with focused assertions for user-visible behaviour and accessible output.

### Commands
- `npm run dev|test|check|build -w frontend`

## API (`api/`)

- AWS Lambda (Node 20), bundled by CDK's `NodejsFunction`.
- `handler.ts` dispatches only; `auth.ts`, `validate.ts`, `upload.ts` hold logic.
- **JWT:** `google-auth-library`'s `OAuth2Client.verifyIdToken` (caches JWKS in module scope). Never call `tokeninfo`.
- **Validation:** decode API Gateway bodies using `isBase64Encoded`; reject decoded bytes > 5 MB; reject if first 1 KB lacks `<html` / `<!doctype` / `<body>`.
- Imports shared response types from `@hostahtml/shared`.

### Testing
Vitest, red-first. Prefer testing through public entrypoints and pure functions without mocking internal modules. Mock S3, `google-auth-library`, and similar provider SDKs only at the module boundary. `Foo.ts` ↔ `Foo.test.ts`. When changing API response shapes or shared types, cover the serialized producer/consumer contract without adding runtime tests for type-only packages.

### Commands
- `npm run test|check -w api`

## Shared (`shared/`)

- Type-only package (`@hostahtml/shared`). No runtime code.
- Bumping a type is a breaking change for both consumers — keep the surface small.

## Infra (`infra/`)

- AWS CDK v2. Resource definitions only.
- Tag infrastructure resources with `owner=sean-johnston` and `service=hostahtml`. Prefer stack-level CDK tags so new resources inherit them; add construct-level tags only when a resource does not inherit cleanly.
- Bucket has a 7-day lifecycle rule matching the presigned URL expiry (ADR-0003).
- API Gateway HTTP API v2 has stage-level route throttle (5 req/s sustained, 10 burst). Per-user limits deferred (ADR-0002).
- CloudFront maps 403/404 to `/200.html`; this must match the SvelteKit adapter-static fallback.
- Lambda entry: `../api/src/handler.ts`. Env: `BUCKET_NAME`, `GOOGLE_CLIENT_ID`, optional `STRICT_HTML_SNIFF`. Google identity must be Codurance (`hd` or `@codurance.com` email); see `api/src/orgPolicy.ts`. Frontend GSI passes `hd` (same domain) in `+page.svelte`.

### Testing
Prefer synth-time assertions and `npm run infra:synth` for fast CDK feedback. Use `infra:diff` before deploy decisions. Avoid tests that require live AWS unless the behaviour cannot be checked from the synthesized template or local code.

### Commands
- Use the root `infra:*` scripts (see "Root scripts" above).

---

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default five-label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
