# 07 — Replace an existing page from the uploads overview

Status: needs-triage

Suggested model: **AFK after stable-link decision** — depends on versioning and uploads overview choices.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

From the user's upload overview, let the owner choose an existing page and upload a replacement so the page's stable public link resolves to the latest version. This should be a narrow end-to-end slice once the stable-link model is chosen.

## Acceptance criteria

- [ ] Owner can start a replacement upload from an item in their uploads overview.
- [ ] Replacement upload updates the existing page's stable link rather than creating an unrelated public link.
- [ ] Recipients opening the stable link after replacement see the latest version.
- [ ] Non-owners cannot replace another user's page.
- [ ] UI communicates that the existing link will continue to work for recipients.
- [ ] Tests cover owner replacement, non-owner rejection, and stable link resolution after replacement.

## Blocked by

- [04 — List my uploads with useful names](./04-list-my-uploads-useful-names.md)
- [05 — Proposal: stable page link forwards to latest version](./05-stable-link-latest-version-proposal.md)

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
