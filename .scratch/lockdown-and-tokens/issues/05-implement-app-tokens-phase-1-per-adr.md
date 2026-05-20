# 05 — Implement app-level share tokens (phase 1 per ADR)

Status: done

Depends on: issue 04 (ADR merged and frozen); **human planning session** (CloudFront path, token shape/TTL, phase-1 scope) before any AFK implementation.

Suggested model: **Opus 4.5 or GPT-5.2** — use after planning is done and issue is moved back to `ready-for-agent` for the implementation pass (multi-surface: CDK Dynamo, HTTP API routes, Lambda, CloudFront, frontend).

Type: **HITL** — completed; phase-1 implementation is now in the repo.

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Vertical slice per **merged** ADR from issue 04: minimal end-to-end path (e.g. POST persists token metadata + returns canonical short URL; GET resolves token and serves or redirects to HTML per ADR phase 1). Includes infra for Dynamo table, API routes, and any CloudFront path behaviour the ADR specifies; frontend shows the new URL shape.

## Acceptance criteria

- [x] **Planning session completed** — decisions (URL shape, CloudFront vs API routing, token length, phase-1 vs later) recorded here or in linked doc; then move status to `ready-for-agent` when ready for implementation.
- [x] Issue 04 is done and ADR merged to `main` (or explicitly accepted on branch).
- [x] Behaviour matches ADR phase 1 checklist after implementation.
- [x] `npm run test -w api` and `npm run test -w frontend` pass; `cdk synth` passes if infra touched.

## Verification

Checked on 2026-05-15 against ADR-0005, ADR-0006, ADR-0007, and current code:

- DynamoDB share-token table exists in CDK with `token` as partition key and TTL on `expiresAt`.
- `POST /upload` mints ULID share tokens, persists token metadata, stores bundle-backed uploads, and returns `{SHARE_BASE_URL}/t/{token}` instead of exposing a long-lived S3 presigned URL.
- `GET /t/{token}` validates and normalizes ULID tokens, returns generic 404 for malformed/missing/expired/revoked tokens, and sets `Cache-Control: private, no-store`.
- Legacy single-object records still resolve by 302 to a short-lived presigned URL; current bundle records serve through `/t/{token}/...` per ADR-0007 so relative assets work.
- Token `expiresAt` remains aligned to the 7-day policy from ADR-0003.

## Remaining follow-up

No new split-out issue is needed from this ticket. The phase-2/scale path for same-origin or CloudFront-backed bundle serving is already tracked by [CloudFront-hosted bundle pages](../../page-workflow-proposals/issues/10-proposal-cloudfront-bundle-hosting.md).

## Blocked by

- [04 — ADR: app-level share tokens](./04-adr-app-level-share-tokens.md)

## User stories covered

- As a user, I get a short, revocable-friendly link once the ADR’s phase 1 is implemented.

## Comments

- 2026-05-12 — Marked `ready-for-human`: explicit planning session required before coding; eight-issue breakdown kept; dependency on 04 unchanged.
- 2026-05-13 — **ADR-0005** and **ADR-0006** are **Accepted** in the repo (documentation); implementation for this issue remains until infra/API match ADR phase 1.
- 2026-05-15 — Verified phase-1 app-token behaviour against current code and marked done. Bundle serving has evolved via ADR-0007; CloudFront/static bundle serving remains tracked separately.
- 2026-05-15 — Verification commands passed: `npm run test -w api`, `npm run test -w frontend`, and `GOOGLE_CLIENT_ID="test-google-client-id.apps.googleusercontent.com" npm run infra:synth`.
