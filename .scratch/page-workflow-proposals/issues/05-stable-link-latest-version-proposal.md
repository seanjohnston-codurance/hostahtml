# 05 — Proposal: stable page link forwards to latest version

Status: needs-triage

Suggested model: **Human** — extend the existing versioned shares proposal before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Page workflow proposals

Related proposal: [Versioned files and links](../../versioned-shares/issues/01-versioning-proposal.md)

## What to build

Decide whether a public page link should represent a stable logical page whose target can move to the latest uploaded version. This proposal should define what "latest" means, who can replace content behind an existing link, whether old versions remain accessible, and how expiry works when a logical page has multiple revisions.

## Acceptance criteria

- [ ] Relationship to the existing versioned shares proposal is documented: merged into that proposal, superseding it, or narrowing one slice of it.
- [ ] Chosen model documented for stable logical page id versus immutable revision id.
- [ ] Ownership and replacement permissions documented.
- [ ] Behaviour for old revisions documented: inaccessible, owner-only, public by version URL, or retained only for rollback.
- [ ] Expiry and lifecycle behaviour documented when a page is replaced before the old version expires.
- [ ] Follow-up implementation tickets are split into independently verifiable slices.

## Blocked by

- [Versioned files and links proposal](../../versioned-shares/issues/01-versioning-proposal.md)

## Comments

- 2026-05-13 — Opened from loose product proposal sketch; likely belongs with the existing versioning work.
