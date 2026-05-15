# 02 — Proposal: recipient-specific secure links

Status: needs-triage

Suggested model: **Human** — security and product design before any `ready-for-agent` breakdown.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

## What to build

Explore per-email-address token links, or another access model, to improve the security and privacy of shared documents. The proposal should compare lightweight bearer links against recipient-bound tokens, optional identity checks, revocation, forwarding resistance, and sender usability.

## Acceptance criteria

- [ ] Describe the security goal: recipient attribution, forwarding resistance, revocation, privacy, or some combination.
- [ ] Compare candidate models such as one-token-per-recipient, authenticated recipient access, passcodes, magic links, and current bearer links.
- [ ] Document how recipients are entered, stored, updated, and removed.
- [ ] Define recipient experience for opening a link, including failures and expired or revoked access.
- [ ] Identify how this interacts with tracking, open-count limits, and existing share-token ADRs.
- [ ] Split the chosen approach into implementation tickets only after the model is selected.

## Blocked by

None — proposal only. Likely related to the existing lockdown and token work.

## Comments

- 2026-05-15 — Captured from a future-work idea: per-email-address token links or other ways to enhance link and document security/privacy.

