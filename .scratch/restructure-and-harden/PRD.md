# Restructure and harden

## Why

The walking-skeleton is up but two layers need work before we add the next product features (listing, deletion, privacy):

**Frontend.** `frontend/src/App.svelte` is a ~270-line monolith with ~420 lines of scoped CSS. No tests, no routing primitives — adding even one extra screen will be painful. The branding pass landed, but the code structure didn't.

**Backend.** `infra/lambda/handler.ts` ships four real smells:
1. S3 objects persist past the 7-day presigned URL expiry → storage grows unbounded.
2. JWT verification round-trips to `oauth2.googleapis.com/tokeninfo` on every upload → ~150 ms latency per call we don't need.
3. No size or content-type validation on uploads.
4. No rate limiting.

The Lambda also lives under `infra/`, which conflates application code with infrastructure definitions.

## Scope

Five tracer-bullet issues, each independently grabbable:

1. **SvelteKit migration + component split** — replace Vite/Svelte with static SvelteKit 2 (`adapter-static`), prerender `/`, emit `200.html` for future client-routed deep links, and split `App.svelte` into `SiteHeader`, `SignInPane`, `Dropzone`, `ResultCard`, `SiteFooter`. TDD with Vitest + `@testing-library/svelte` v5. Stay on Svelte 5 runes.
2. **Workspaces + relocate Lambda** — add npm workspaces (`frontend/`, `api/`, `shared/`, `infra/`). Move `infra/lambda/handler.ts` to `api/src/handler.ts` verbatim. Create `shared/` for cross-package types. Zero behaviour change.
3. **API refactor + hardening** — split `api/src/handler.ts` into `handler.ts` (dispatch) + `auth.ts` (JWKS via `google-auth-library`) + `validate.ts` (decoded-byte size + HTML sniff) + `upload.ts` (orchestration). TDD red-first. Addresses smells #2 and #3.
4. **Infra: S3 lifecycle + API GW throttle + fallback routing** — 7-day S3 lifecycle rule, HTTP API v2 stage route throttle (5 req/s, 10 burst), and CloudFront 403/404 mapping to `/200.html`. Addresses smells #1 and #4 and keeps static deep-link routing aligned with SvelteKit.
5. **CLAUDE.md update** — fold new conventions (Svelte 5 runes, TDD, workspace layout, api conventions) into the existing `CLAUDE.md`. Symlink `AGENTS.md → CLAUDE.md`.

## Out of scope

- Database-backed features (listing, deletion, per-user privacy). Tracked separately — they'll introduce DynamoDB and revisit ADR-0002.
- Migrating Lambda → SvelteKit server routes. Rationale in **ADR-0001**.
- Permanent share links (current 7-day expiry is intentional per **ADR-0003**).

## Success criteria

- All issue acceptance criteria green.
- `cdk deploy` succeeds, manual smoke test of upload flow passes (sign-in, upload valid HTML, copy link, follow link).
- Rationale for the four cross-cutting decisions recorded in `docs/adr/0001`–`0004`.

## Where rationale lives

- Cross-cutting trade-offs: `docs/adr/`
- Per-issue acceptance criteria: `./issues/`
