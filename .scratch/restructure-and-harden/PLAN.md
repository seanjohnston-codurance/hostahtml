# Plan: SvelteKit migration, component split, TDD, repo restructure, infra hardening

## Context
Two concerns rolled into one delivery:

**A. Frontend refactor.** Monolithic Svelte 5 + Vite SPA (`frontend/src/App.svelte`, ~270 lines logic + ~420 lines CSS) becomes a static SvelteKit 2 app with extracted components and Vitest-based TDD. The `/` route is prerendered at build time; a `200.html` fallback supports future client-routed deep links through CloudFront. Stays on Svelte 5 (runes only: `$state`, `$props`, `$effect`; never `export let`). The GitHub Actions deploy syncs `frontend/dist/` to S3, so adapter-static must output to `dist`.

**B. Backend hardening & repo restructure.** Address smells in `infra/lambda/handler.ts`:
1. S3 objects persist past the 7-day presigned URL expiry → add S3 lifecycle rule.
2. JWT verification via Google's `tokeninfo` endpoint adds ~150ms per upload → switch to local JWKS-based verification via `google-auth-library`. No DB needed.
3. No size/content validation → add 5MB cap + simple HTML content sniff.
4. No rate limiting → add API Gateway HTTP API v2 stage route throttle (cheap insurance). Per-user limits deferred until DynamoDB lands for the listing/deletion features.

**C. Restructure.** Promote the Lambda out of `infra/` so it's treated as a real app, and add a `shared/` workspace for cross-package types:
```
hostahtml/
  frontend/      # unchanged location
  api/           # ← was infra/lambda/handler.ts
  shared/        # shared TypeScript types
  infra/         # CDK only, references ../api and ../frontend/dist
```

**Svelte 5 compatibility check:** SvelteKit 2 supports Svelte 5 natively; @testing-library/svelte v5+ supports Svelte 5. No downgrade or compat shim needed.

**Project conventions (per `CLAUDE.md` + `docs/agents/*`):**
- Issues live in `.scratch/<slug>/` with a `PRD.md` and numbered `issues/NN-*.md`, each carrying a `Status:` line (default `needs-triage`).
- Architectural decisions go in `docs/adr/NNNN-*.md` — written when decisions crystallise.
- Slug for this work: **`restructure-and-harden`**.

**Order of work:**
- **Phase 0** sets up the issue tracker artefacts and writes ADRs for decisions already made.
- **Phases 1–5** (frontend) and **Phases 6–8** (restructure + api + infra) are independent and can be tackled in either order.
- **Phase 6** (relocate Lambda) must happen before **Phase 7** (refactor + harden) so new code lands in its final home.
- **Phase 9** (CLAUDE.md update) is last so it reflects the final state.

---

## Target file structure

```
hostahtml/
  CLAUDE.md                           # repo-wide conventions (frontend + api)
  AGENTS.md                           # symlink → CLAUDE.md
  package.json                        # npm workspaces root: frontend, api, shared

  frontend/                           # Svelte 5 + static SvelteKit 2 frontend
    src/
      app.html                        # replaces index.html
      app.css                         # global reset + body styles
      lib/components/
        SiteHeader.svelte  + .test.ts
        SignInPane.svelte  + .test.ts
        Dropzone.svelte    + .test.ts
        ResultCard.svelte  + .test.ts
        SiteFooter.svelte  + .test.ts
      routes/
        +layout.ts                    # prerender: true; no runtime SSR server
        +layout.svelte                # imports app.css, renders <slot/>
        +page.svelte                  # all $state + logic, composes components
    svelte.config.js
    vite.config.ts                    # uses sveltekit() plugin
    vitest.config.ts                  # separate config with svelte() + jsdom
    package.json                      # depends on @hostahtml/shared
    tsconfig.json                     # extends .svelte-kit/tsconfig.json

  api/                                # Lambda handler (was infra/lambda/)
    src/
      handler.ts                      # entry — only route dispatching
      auth.ts                         # JWKS-based Google JWT verification
      upload.ts                       # POST /upload — size + content checks + S3 put
      validate.ts                     # size + HTML sniff helpers
      handler.test.ts                 # vitest unit tests (mock S3 + JWT)
    package.json                      # depends on @hostahtml/shared, google-auth-library
    tsconfig.json

  shared/                             # @hostahtml/shared — cross-package types
    src/
      api.ts                          # UploadResponse, ErrorResponse, etc.
      index.ts                        # barrel
    package.json
    tsconfig.json

  infra/                              # CDK only — no app code lives here anymore
    bin/hostahtml.ts
    lib/hostahtml-stack.ts            # bucket lifecycle, API GW throttle, /200.html fallback routing
    package.json

  docs/adr/                           # architecture decision records (new)
    0001-static-spa-plus-dedicated-lambda.md
    0002-defer-per-user-rate-limits.md
    0003-7-day-ttl-alignment.md
    0004-npm-workspaces-flat-layout.md

  .scratch/restructure-and-harden/    # issue tracker artefacts (new)
    PRD.md
    issues/
      01-sveltekit-migration.md       # Phases 1–5
      02-relocate-lambda-and-workspaces.md  # Phase 6
      03-api-hardening.md             # Phase 7
      04-infra-lifecycle-and-throttle.md    # Phase 8
      05-claude-md-update.md          # Phase 9
```

**Files deleted:**
- `frontend/src/main.ts`, `frontend/index.html`, `frontend/src/vite-env.d.ts`, `frontend/src/App.svelte`
- `infra/lambda/` directory entirely (relocated in Phase 6, refactored in Phase 7)

---

## Phase 0 — Persist plan to `.scratch/` + write ADRs

This phase is non-code: it makes the work visible to the project (and to future Claude sessions reading `CLAUDE.md`).

### 0a — Create `.scratch/restructure-and-harden/`

- **`PRD.md`** — one-page brief: motivation (frontend tech debt + backend smells), scope (the 4 smells + frontend refactor), out-of-scope (DB-backed listing/deletion/privacy — explicitly punt to a follow-up), success criteria (verification commands from the bottom of this plan all pass).
- **`issues/01-sveltekit-migration.md`** — covers Phases 1–5. `Status: ready-for-agent`.
- **`issues/02-relocate-lambda-and-workspaces.md`** — covers Phase 6. `Status: ready-for-agent`. Note: relocation only, no behaviour change.
- **`issues/03-api-hardening.md`** — covers Phase 7. `Status: ready-for-agent`. Depends on issue 02.
- **`issues/04-infra-lifecycle-and-throttle.md`** — covers Phase 8. `Status: ready-for-agent`. Independent of the above.
- **`issues/05-claude-md-update.md`** — covers Phase 9. `Status: needs-info` (waits on all others to land first).

Each issue file: title, `Status:` line, motivation paragraph, concrete acceptance criteria, pointer to the relevant section of this plan. Keep tight — these are agent-grabbable work items, not novels.

### 0b — Create `docs/adr/` with four ADRs

Use a minimal ADR template (Context → Decision → Consequences). One ADR per crystallised decision:

- **`0001-static-spa-plus-dedicated-lambda.md`** — Why a static SvelteKit frontend + dedicated Lambda over SvelteKit server routes. The app prerenders `/` at build time and keeps a `200.html` fallback for client-routed deep links. Trade-off: code locality vs CDN simplicity / cold-start surface.
- **`0002-defer-per-user-rate-limits.md`** — Why API Gateway stage throttle now, per-user DynamoDB-backed limits deferred. Couples to the future listing/deletion work which will introduce the DB.
- **`0003-7-day-ttl-alignment.md`** — Why the S3 lifecycle expiry, presigned URL expiry, and product-facing "live for 7 days" copy all share the same number. Consequence: changing any of the three means changing all three.
- **`0004-npm-workspaces-flat-layout.md`** — Why `frontend/`, `api/`, `shared/`, `infra/` at the repo root rather than under `packages/`. Threshold to revisit: ≥5 workspaces.

ADRs are written first (in Phase 0) because the decisions are already made — the rest of the plan is downstream of them.

---

## Phase 1 — Package changes

**Keep at current versions:**
- `svelte ^5.0.0` — **do not change**; runes (`$state`, `$effect`, `$props`) are Svelte 5 only
- `typescript ^5.5.0`

**Keep explicit dev dependencies:** `@sveltejs/vite-plugin-svelte` and `vite`. SvelteKit uses `sveltekit()` in `vite.config.ts`; `vitest.config.ts` uses the Svelte plugin directly.

**Add to devDependencies:**
```
@sveltejs/kit@^2.0.0           # SvelteKit 2 — fully supports Svelte 5
@sveltejs/adapter-static@^3.0.0
svelte-check@^4.0.0            # supports Svelte 5
vitest@^3.0.0
@testing-library/svelte@^5.0.0 # v5+ is the Svelte 5 compatible line
@testing-library/jest-dom@^6.0.0
@testing-library/user-event@^14.0.0
jsdom@^26.0.0
```

Keep `@sveltejs/vite-plugin-svelte` as an explicit dep (used in `vitest.config.ts`).

After `npm install`, run `npx svelte --version` to confirm Svelte resolved to a 5.x version.

**New scripts:**
```json
"check": "svelte-check --tsconfig ./tsconfig.json",
"test": "vitest run",
"test:watch": "vitest",
"postinstall": "svelte-kit sync || true"
```

---

## Phase 2 — SvelteKit scaffolding files

**`svelte.config.js`**
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: '200.html',   // CloudFront 403/404 rewrites must point here
    }),
  },
};
export default config;
```

**`vite.config.ts`**
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [sveltekit()] });
```

**`src/app.html`** — copy from `index.html`, replace `<div id="app">` with `%sveltekit.body%`, add `%sveltekit.head%` in `<head>`. Fonts link stays here.

**`src/routes/+layout.ts`**
```ts
export const prerender = true;
```

Leave SSR enabled for the prerender pass. With `adapter-static`, this does **not** introduce a runtime server; it emits static HTML for `/` at build time, plus `200.html` for client-routed deep links.

**`src/routes/+layout.svelte`**
```svelte
<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

{@render children()}
```

**`src/app.css`** — the two `:global()` blocks from App.svelte's `<style>`: the `*` reset and `body` block.

**`tsconfig.json`** — change to `"extends": "./.svelte-kit/tsconfig.json"`, keep `"strict": true`.

---

## Phase 3 — Vitest setup

**`vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

`$lib` alias is required because `sveltekit()` isn't used here.

**`src/test-setup.ts`**
```ts
import '@testing-library/jest-dom/vitest';
```

---

## Phase 4 — TDD component extraction (red → green order)

### Component props contracts

| Component | Props |
|---|---|
| `SiteFooter` | none |
| `SiteHeader` | `userEmail: string \| null` |
| `ResultCard` | `result: {url: string, expiresInDays: number}`, `copied: boolean`, `onCopy: () => void` |
| `SignInPane` | `googleButtonId: string` |
| `Dropzone` | `uploading: boolean`, `onFile: (file: File) => void` |

`dragOver` state lives **inside** `Dropzone` (it's internal visual state).
`copied` state and 2s timeout live in `+page.svelte`; `ResultCard` is purely presentational.
The `$effect` for Google GSI script loading stays in `+page.svelte`.

**Svelte 5 syntax requirements (all components):**
- Props via `let { foo, bar }: { foo: T; bar: U } = $props();` — never `export let`
- State via `let count = $state(0);` — never plain `let` for reactive state
- Side effects via `$effect(() => { … })` — never `onMount` for reactive effects
- Event handlers as attributes: `onclick={…}`, `ondrop={…}` (no colon syntax)
- The `$lib/components/*.svelte` files plus `+page.svelte` and `+layout.svelte` must all be runes-mode

### Test coverage per component

**SiteFooter:** renders copyright text, renders product label

**SiteHeader:** renders wordmark text, hides user chip when `userEmail=null`, shows email in chip when signed in

**ResultCard:** URL renders as a link with correct href, expiry badge shows days, "Copy link" button present, clicking calls `onCopy`, `copied=true` shows "Copied!" text

**SignInPane:** h1 heading present, sign-in prompt text present, div with given `googleButtonId` renders

**Dropzone:** idle — shows drop label and browse link, file input has correct `accept`; uploading — shows "Uploading…", hides idle UI; file drop — calls `onFile` with the file; input change — calls `onFile` with the file

### CSS distribution
- Global reset + body → `src/app.css`
- Per-component styles → that component's `<style>` block
- Page-level styles (`.page`, `.bg-glyph`, `.main`, `.upload-pane`, `.card`, `.card-header`, `.eyebrow-sm`, `.card-title`, `.error-bar`) → `+page.svelte`

---

## Phase 5 — +page.svelte assembly

Move all `$state`, all functions, and the `$effect` from `App.svelte` into `+page.svelte` verbatim. Replace inline markup with imported components. The only logic change: `upload(file)` is passed as the `onFile` prop to `<Dropzone>`.

---

## Phase 6 — Workspaces + relocate Lambda (no behaviour change)

This phase is deliberately mechanical: file moves, workspace setup, no logic edits. One reviewable diff = "relocation". Phase 7 does the refactor + hardening in the new location.

### 6a — npm workspaces setup

Create root `package.json` declaring workspaces. The existing `frontend/` and `infra/` `package.json` files stay; just add `api/` and `shared/`.

```json
{
  "name": "hostahtml",
  "private": true,
  "workspaces": ["frontend", "api", "shared", "infra"]
}
```

After this, `npm install` at the root installs all workspaces and creates symlinks for cross-workspace deps (`@hostahtml/shared`).

### 6b — Create `shared/`

```
shared/
  src/
    api.ts            # UploadResponse, ErrorResponse
    index.ts          # re-exports
  package.json        # name: @hostahtml/shared, main: src/index.ts (no build step needed if consumers use TS directly)
  tsconfig.json
```

Initial content of `shared/src/api.ts`:
```ts
export type UploadResponse = {
  url: string;
  key: string;
  expiresInDays: number;
};

export type ErrorResponse = { error: string };
```

`shared/package.json`:
```json
{
  "name": "@hostahtml/shared",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

Frontend and api consume via `import type { UploadResponse } from '@hostahtml/shared'`.

### 6c — Relocate Lambda from `infra/lambda/` to `api/` (verbatim)

1. Move `infra/lambda/handler.ts` → `api/src/handler.ts` — **no edits to the file contents**.
2. Create `api/package.json` with the deps needed for the existing handler (no `google-auth-library` yet — that arrives in Phase 7):
   ```json
   {
     "name": "@hostahtml/api",
     "private": true,
     "type": "module",
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest"
     },
     "dependencies": {
       "@aws-sdk/client-s3": "^3.0.0",
       "@aws-sdk/s3-request-presigner": "^3.0.0",
       "@hostahtml/shared": "*"
     },
     "devDependencies": {
       "@types/aws-lambda": "^8.10.0",
       "vitest": "^3.0.0",
       "typescript": "^5.5.0"
     }
   }
   ```
3. Update `infra/lib/hostahtml-stack.ts` `NodejsFunction` `entry` from `infra/lambda/handler.ts` to `../api/src/handler.ts`.
4. Delete `infra/lambda/` directory entirely.
5. Update `.github/workflows/deploy.yml` if it references the old Lambda path.

**Acceptance:** `cdk diff` should show no resource topology or configuration changes. A Lambda code asset/hash diff is acceptable because the source path moved. The deployed function behaves identically. This is a relocation, not a refactor.

---

## Phase 7 — API refactor + hardening (TDD in the new `api/` workspace)

Split `api/src/handler.ts` into focused modules, harden each, write tests red-first. Add `google-auth-library` to `api/package.json` now.

### 7a — File split (red-first per module)

### 7b — `auth.ts` — JWKS-based JWT verification

```ts
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;

export async function verifyGoogleToken(token: string): Promise<string> {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('no sub claim');
  return payload.sub;
}
```

`OAuth2Client` caches Google's public keys in module scope. Across warm Lambda invocations: zero network calls for verification.

**Tests** (`auth.test.ts`): mock `OAuth2Client.verifyIdToken`, assert correct audience is passed, assert errors when payload missing.

### 7c — `validate.ts` — size + content check

```ts
const MAX_BYTES = 5_000_000;
const HTML_HINTS = /<html|<!doctype|<body/i;

export function validateUpload(body: Buffer): void {
  if (body.length > MAX_BYTES) {
    throw new Error(`File too large (${body.length} > ${MAX_BYTES})`);
  }
  const head = body.subarray(0, 1024).toString('utf8');
  if (!HTML_HINTS.test(head)) {
    throw new Error('Body does not look like HTML');
  }
}
```

Validation always runs on decoded bytes, never directly on `event.body`. Preserve the existing API Gateway v2 behaviour where Lambda receives a string body plus `isBase64Encoded`:

```ts
export function decodeBody(body: string | undefined, isBase64Encoded: boolean): Buffer {
  return isBase64Encoded
    ? Buffer.from(body ?? '', 'base64')
    : Buffer.from(body ?? '', 'utf8');
}
```

**Tests** (`validate.test.ts`):
- accepts a 1KB `<!doctype html>` buffer
- rejects empty buffer (no HTML markers)
- rejects 6MB buffer
- rejects a binary blob
- decodes plain UTF-8 API Gateway bodies before validation
- decodes base64 API Gateway bodies before validation

### 7d — `upload.ts` — composes auth + validate + S3 put + presigned URL

Pure orchestration. Returns `UploadResponse` from `@hostahtml/shared`.

**Tests** (`upload.test.ts`): mock `S3Client.send` and `verifyGoogleToken`. Cover: 401 on missing token, 401 on bad token, 413 on too-large decoded body, 415 on non-HTML decoded body, 200 with expected response shape on success. Include both plain and base64-encoded API Gateway event bodies so the refactor preserves current upload handling.

### 7e — `handler.ts` — route dispatch only

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleUpload } from './upload';

export const handler = async (e: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const { method } = e.requestContext.http;
  const path = e.rawPath;
  if (method === 'GET' && path === '/') return { statusCode: 200, body: '{"status":"ok"}' };
  if (method === 'POST' && path === '/upload') return handleUpload(e);
  return { statusCode: 404, body: '{"error":"Not found"}' };
};
```

---

## Phase 8 — Infra updates (S3 lifecycle + API Gateway throttle + static fallback routing)

Edit `infra/lib/hostahtml-stack.ts`:

**Bucket lifecycle:**
```ts
const bucket = new s3.Bucket(this, 'UploadsBucket', {
  // ...existing config...
  lifecycleRules: [
    {
      id: 'expire-after-7-days',
      expiration: cdk.Duration.days(7),
    },
  ],
});
```

**API Gateway throttle** (HTTP API v2 stage-level, applies to all routes):
```ts
const stage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage;
stage.defaultRouteSettings = {
  throttlingRateLimit: 5,
  throttlingBurstLimit: 10,
};
```

This stack uses `aws-cdk-lib/aws-apigatewayv2.HttpApi`, so use API Gateway v2 stage route settings. Do not use REST API examples like `defaultMethodOptions`, and do not use a non-existent `HttpApi` `defaultRouteOptions.throttle`.

**CloudFront static fallback routing:**
```ts
const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
  // ...existing config...
  defaultRootObject: 'index.html',
  errorResponses: [
    {
      httpStatus: 403,
      responseHttpStatus: 200,
      responsePagePath: '/200.html',
    },
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/200.html',
    },
  ],
});
```

`index.html` remains the prerendered `/` route. `200.html` is the SvelteKit adapter-static fallback for future client-routed deep links. Keep `svelte.config.js` `fallback` and CloudFront `responsePagePath` in sync.

Verification: `cdk diff` should show the new lifecycle rule, throttle settings, and CloudFront error response page change; no other resource changes.

---

## Phase 9 — Update `CLAUDE.md` to reflect the new state

The existing repo-root `CLAUDE.md` is currently a thin pointer to `docs/agents/*`. After Phases 0–8 the repo has new conventions (Svelte 5 runes, TDD workflow, workspaces layout, api conventions). Update `CLAUDE.md` *in place* — don't replace; append a new top section describing the project workspaces and conventions, keep the existing `## Agent skills` section intact at the bottom.

Symlink `AGENTS.md → CLAUDE.md` at the repo root:
```bash
ln -s CLAUDE.md AGENTS.md
```

**Content to add to the top of `CLAUDE.md`** (before the existing `## Agent skills`):

````markdown
# hostahtml

Internal Codurance tool for sharing HTML files. Workspaces:
- `frontend/` — Svelte 5 + static SvelteKit 2, deployed as static files to S3 + CloudFront
- `api/` — AWS Lambda handler for upload + auth
- `shared/` — TypeScript types shared between `frontend` and `api`
- `infra/` — AWS CDK stack (S3 bucket, CloudFront, Lambda, API Gateway)

Use `npm` workspaces. Run commands from the workspace root unless noted.

## Frontend (`frontend/`)

- **Svelte 5** with runes only. Use `$state`, `$props`, `$effect`. Never `export let`, never legacy stores for component state.
- **SvelteKit 2** with `@sveltejs/adapter-static`. Prerender `/` at build time (`prerender: true`) and emit `200.html` as the fallback for future client-routed deep links. No runtime SSR server.
- Build output: `dist/` (matched by `.github/workflows/deploy.yml` — do not change either without updating both).
- TypeScript strict mode.

### Layout
- `src/routes/` — pages and layouts; `+page.svelte` owns state and orchestrates components
- `src/lib/components/` — presentational components, each with a colocated `*.test.ts`
- `src/app.css` — global reset + body styles only
- `src/app.html` — HTML shell (fonts, meta)

### Component conventions
- Props: `let { foo }: { foo: T } = $props();`
- Internal state: `let x = $state(…);`
- Effects (DOM / external scripts): `$effect(() => { …; return cleanup; });`
- Event handlers as attributes: `onclick={…}`, `ondrop={…}`
- Keep components presentational; callbacks via props, state in the parent route.
- Import shared types from `@hostahtml/shared`.

### Testing — TDD
- **Vitest** + **@testing-library/svelte v5** + **jsdom**
- Red → green → refactor. Write the failing test first.
- Tests live next to the component: `Foo.svelte` ↔ `Foo.test.ts`
- Test behaviour through the DOM, not implementation details.
- Prefer `@testing-library/user-event` over `fireEvent` for clicks/typing; use `fireEvent` for drag/drop.
- Branding: Codurance orange `#E8591A`, navy `#1A2535`, teal `#2BB5C8`. Fonts: Nunito Sans, DM Mono.

### Commands
- `npm run dev -w frontend` — local dev server
- `npm run test -w frontend` / `:watch` — Vitest
- `npm run check -w frontend` — svelte-check
- `npm run build -w frontend` — produces `dist/`

## API (`api/`)

- **AWS Lambda** (Node 20 runtime), TypeScript, bundled by CDK's `NodejsFunction`.
- One file per responsibility: `handler.ts` only dispatches; `auth.ts`, `upload.ts`, `validate.ts` hold logic.
- **JWT verification:** use `google-auth-library`'s `OAuth2Client.verifyIdToken`. It caches JWKS in module scope across warm invocations. Never call `oauth2.googleapis.com/tokeninfo` — too slow.
- **Validation:** decode API Gateway bodies using `isBase64Encoded`, then reject decoded bytes > 5MB or if the first 1KB doesn't contain `<html`, `<!doctype`, or `<body>` (case-insensitive).
- **Errors:** return `{ statusCode, body: JSON.stringify({ error }) }`. Don't leak stack traces.
- **Shared types:** import response shapes from `@hostahtml/shared`.

### Testing
- **Vitest** for unit tests, red-first. Mock the S3 client and `google-auth-library` at the module boundary.
- Tests live next to source: `upload.ts` ↔ `upload.test.ts`.

### Commands
- `npm run test -w api` — Vitest

## Shared (`shared/`)

- Type-only package: `@hostahtml/shared`. No runtime code.
- Add types here when they cross the `frontend` ↔ `api` boundary.
- Bumping a type is a breaking change for both consumers — keep the surface small.

## Infra (`infra/`)

- AWS CDK v2. No application code here — only resource definitions.
- The bucket has a 7-day expiration lifecycle rule that matches the presigned URL expiry (see ADR-0003).
- API Gateway HTTP API v2 has stage-level route throttling (5 req/s sustained, 10 burst). Per-user limits deferred (see ADR-0002).
- CloudFront maps 403/404 to `/200.html`; this must match the SvelteKit adapter-static fallback.
- The Lambda's entry path is `../api/src/handler.ts` via `NodejsFunction`.
- Required env vars on the Lambda: `BUCKET_NAME`, `GOOGLE_CLIENT_ID`.

### Commands
- `cd infra && npx cdk diff` / `cdk deploy`

---
````

(The existing `## Agent skills` section — issue tracker, triage labels, domain docs — remains below.)

---

## Verification

**Phase 0 (issue tracker + ADRs):**
```bash
ls .scratch/restructure-and-harden/PRD.md
ls .scratch/restructure-and-harden/issues/    # 5 issue files, each with a Status: line
grep -l '^Status:' .scratch/restructure-and-harden/issues/*.md
ls docs/adr/0001-static-spa-plus-dedicated-lambda.md
ls docs/adr/0002-defer-per-user-rate-limits.md
ls docs/adr/0003-7-day-ttl-alignment.md
ls docs/adr/0004-npm-workspaces-flat-layout.md
```

**Frontend (Phases 1–5):**
```bash
npx svelte --version             # must print 5.x — gates the rest
npm run test -w frontend         # component tests green
npm run check -w frontend        # svelte-check clean (also flags Svelte 4 syntax)
npm run build -w frontend        # adapter-static emits to frontend/dist/
npm run dev -w frontend          # local dev, Google sign-in renders, upload flow works
ls frontend/dist/index.html      # prerendered / route
ls frontend/dist/200.html        # adapter-static fallback for CloudFront 403/404 rewrites
grep -l '\$props\|\$state\|\$effect' frontend/src/lib/components/*.svelte frontend/src/routes/+page.svelte
                                 # lists every component using runes
```

**Restructure (Phase 6 — relocation only):**
```bash
ls api/src/handler.ts            # exists, contents identical to old infra/lambda/handler.ts
ls shared/src/api.ts             # exists
ls infra/lambda/ 2>/dev/null && echo "FAIL: should be deleted" || echo "ok"
npm install                      # at repo root, succeeds with workspaces
cd infra && npx cdk diff         # no topology/config changes; Lambda code asset/hash diff is acceptable
```

**API hardening (Phase 7):**
```bash
npm run test -w api              # all unit tests green (auth, validate, upload, handler)
```
Manual smoke test post-deploy: upload a 6MB file (expect 413), upload a non-HTML file (expect 415), upload valid HTML (expect 200 + URL).

**Infra (Phase 8):**
```bash
cd infra && npx cdk diff         # shows lifecycle rule, HTTP API v2 throttle, and /200.html fallback routing
cd infra && npx cdk deploy
aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET"
                                 # confirms 7-day expiration rule present
```
After deploy, upload a test file and confirm it's gone from S3 after 7 days (lifecycle is eventually consistent within 48h, so check at day 8–9).

**CLAUDE.md (Phase 9 — done last):**
```bash
ls -l AGENTS.md                  # is a symlink → CLAUDE.md
grep -q '^# hostahtml' CLAUDE.md # new top section added
grep -q '^## Agent skills' CLAUDE.md  # existing section preserved
```
