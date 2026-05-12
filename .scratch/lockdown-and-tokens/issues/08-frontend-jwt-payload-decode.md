# 08 — Frontend: base64url-safe JWT payload for sign-in chip

Status: done

Suggested model: **composer-2-fast**

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Replace raw `atob` on the GSI credential with a small helper that base64url-decodes the JWT payload segment and safely `JSON.parse`s for `email` display; failures must not throw in the callback (e.g. set `userEmail` null). Colocated Vitest unit test for the helper.

## Acceptance criteria

- [ ] Helper lives under `frontend/src/lib/` and is used from `+page.svelte` (or equivalent route).
- [ ] Vitest covers at least one valid base64url payload and one failure path.
- [ ] `npm run test -w frontend` passes.

## Blocked by

None — can start immediately.

## User stories covered

- As a user, odd Google token encodings do not brick the sign-in UI.

## Comments
