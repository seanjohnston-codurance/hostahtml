# 01 — Proposal: recipient open and action audit trail

Status: needs-triage

Suggested model: **Human** — product, privacy, and legal review before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

## What to build

Explore whether shared documents should record recipient opens and meaningful actions, such as first open, repeat opens, downloads, copy-link events, or other document interactions. The eventual feature should help a sender understand whether a shared document was engaged with, while being explicit about consent, privacy expectations, retention, and what can be inferred from link activity.

## Acceptance criteria

- [ ] Define which recipient events are useful enough to track and which should be excluded.
- [ ] Decide whether tracking is always on, sender-configurable, recipient-visible, or unavailable for some document classes.
- [ ] Document privacy, retention, and access rules for audit data.
- [ ] Identify whether tracking depends on per-recipient links, authenticated recipients, or anonymous link telemetry.
- [ ] Split the chosen approach into independently verifiable implementation tickets.

## Blocked by

None — proposal only. Implementation should wait for product and privacy decisions.

## Comments

- 2026-05-15 — Captured from a future-work idea: track and trace openings and actions by people who opened links.

