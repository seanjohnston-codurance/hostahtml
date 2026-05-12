# 06 — Hygiene: `.svelte-kit` gitignore, api `tsc`, CI typecheck

Status: done

Suggested model: **composer-2-fast** (config + CI wiring; Sonnet if `shared` package resolution fights `tsc`)

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Frontend ignores `.svelte-kit/`. API workspace has a `check`/`tsc --noEmit` script and `npx tsc -p api` exits clean after fixing `shared` resolution if needed. GitHub Actions runs api typecheck after api unit tests.

## Acceptance criteria

- [ ] `frontend/.gitignore` contains `.svelte-kit/`.
- [ ] `npm run check -w api` (or equivalent) passes locally.
- [ ] Deploy workflow runs api typecheck post-test.
- [ ] `npm run check -w frontend` still passes.

## Blocked by

None — can start immediately.

## User stories covered

- As maintainer, CI catches type drift in `api/` without relying on Vitest alone.

## Comments
