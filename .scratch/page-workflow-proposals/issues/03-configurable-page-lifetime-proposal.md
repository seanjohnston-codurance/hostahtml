# 03 — Proposal: configurable page lifetime

Status: needs-triage

Suggested model: **Human** — this changes the current 7-day TTL product policy and needs ADR review.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

Decide whether users can choose how long an uploaded page remains available, and if so what lifetime options are allowed. The proposal must reconcile product copy, token expiry, S3 lifecycle, and any future listing/overview behaviour so pages do not appear available after their public access expires.

## Acceptance criteria

- [ ] Allowed lifetime model documented: fixed choices, custom date, account-level default, or no configurability.
- [ ] Default and maximum lifetime documented.
- [ ] ADR-0003 impact documented, including whether to amend, replace, or preserve the current 7-day policy for default uploads.
- [ ] Storage cleanup and share-token expiry behaviour documented for each supported lifetime.
- [ ] UI copy expectations documented for upload success, overview lists, and expired pages.
- [ ] Follow-up implementation tickets are split into independently verifiable slices.

## Blocked by

None — proposal only.

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
