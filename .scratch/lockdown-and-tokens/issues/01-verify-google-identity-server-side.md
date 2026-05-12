# 01 — Verify Google identity server-side (domain + email_verified)

Status: done

Suggested model: **composer-2-fast** (tight branching + tests; escalate to Sonnet if auth edge cases multiply)

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

End-to-end: after Google ID token verification, the API rejects uploads unless the token’s email is verified and the identity belongs to an allowed hosted domain or email-domain allowlist. Lambda receives new env vars from CDK; tests prove 401 for wrong domain, unverified email, and happy path unchanged for valid Codurance-shaped tokens.

## Acceptance criteria

- [ ] `api/src/auth.ts` enforces `email_verified` and either `ALLOWED_HOSTED_DOMAIN` (match `hd`) or comma-separated `ALLOWED_EMAIL_DOMAINS` (match email host).
- [ ] CDK passes those env vars on `ApiFunction` alongside existing `GOOGLE_CLIENT_ID` / `BUCKET_NAME`.
- [ ] Vitest covers 401 paths and does not regress existing verifyIdToken audience behaviour.
- [ ] `npm run test -w api` passes.

## Blocked by

None — can start immediately.

## User stories covered

- As an operator, only accounts matching our org policy can obtain upload authorization.
- As security, OAuth client misconfiguration cannot be compensated by UI copy alone.

## Comments
