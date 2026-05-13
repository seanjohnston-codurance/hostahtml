# 05 — Implement app-level share tokens (phase 1 per ADR)

Status: ready-for-human

Depends on: issue 04 (ADR merged and frozen); **human planning session** (CloudFront path, token shape/TTL, phase-1 scope) before any AFK implementation.

Suggested model: **Opus 4.5 or GPT-5.2** — use after planning is done and issue is moved back to `ready-for-agent` for the implementation pass (multi-surface: CDK Dynamo, HTTP API routes, Lambda, CloudFront, frontend).

Type: **HITL** — hold for a dedicated planning session; do not start implementation until outcomes are recorded (update this issue or child issues). After planning, may split into smaller `ready-for-agent` slices.

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Vertical slice per **merged** ADR from issue 04: minimal end-to-end path (e.g. POST persists token metadata + returns canonical short URL; GET resolves token and serves or redirects to HTML per ADR phase 1). Includes infra for Dynamo table, API routes, and any CloudFront path behaviour the ADR specifies; frontend shows the new URL shape.

## Acceptance criteria

- [ ] **Planning session completed** — decisions (URL shape, CloudFront vs API routing, token length, phase-1 vs later) recorded here or in linked doc; then move status to `ready-for-agent` when ready for implementation.
- [ ] Issue 04 is done and ADR merged to `main` (or explicitly accepted on branch).
- [ ] Behaviour matches ADR phase 1 checklist after implementation.
- [ ] `npm run test -w api` and `npm run test -w frontend` pass; `cdk synth` passes if infra touched.

## Blocked by

- [04 — ADR: app-level share tokens](./04-adr-app-level-share-tokens.md)

## User stories covered

- As a user, I get a short, revocable-friendly link once the ADR’s phase 1 is implemented.

## Comments

- 2026-05-12 — Marked `ready-for-human`: explicit planning session required before coding; eight-issue breakdown kept; dependency on 04 unchanged.
- 2026-05-13 — **ADR-0005** and **ADR-0006** are **Accepted** in the repo (documentation); implementation for this issue remains until infra/API match ADR phase 1.
