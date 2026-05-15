# 03 — Proposal: open-count limits alongside expiry time

Status: needs-triage

Suggested model: **Human** — needs product and security policy before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

## What to build

Explore allowing a share to expire after it has been opened a configured number of times, in addition to the existing time-based expiry. The proposal should define what counts as an open, how strict the limit needs to be, and how the system behaves when the count is exhausted.

## Acceptance criteria

- [ ] Define whether the count means page views, unique recipients, successful document fetches, downloads, or another observable event.
- [ ] Decide whether limits are sender-configurable or fixed by policy.
- [ ] Document race-condition tolerance for simultaneous opens near the limit.
- [ ] Define recipient-facing behaviour once the limit has been reached.
- [ ] Identify storage and counting requirements, including whether anonymous bearer links are sufficient.
- [ ] Split the chosen approach into implementation tickets.

## Blocked by

None — proposal only. May depend on decisions from [recipient-specific secure links](./02-recipient-specific-secure-links.md) if limits are per recipient.

## Comments

- 2026-05-15 — Captured from a future-work idea: support open-n-times as well as expires-at.

