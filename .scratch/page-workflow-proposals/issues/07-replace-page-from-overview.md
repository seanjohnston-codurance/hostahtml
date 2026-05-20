# 07 — Create a new version from the uploads overview

Status: needs-triage

Suggested model: **AFK after versioning decision** — replacement is version creation and depends on the canonical versioning proposal.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

From the user's upload overview, let the owner choose an existing document and upload replacement content as a **new version**. The existing stable public link should resolve to the latest version according to the versioning model, while any dedicated old-version URLs continue to follow that model's access and expiry rules.

## Acceptance criteria

- [ ] Owner can start a "create new version" upload from an item in their uploads overview.
- [ ] The upload creates a new version of the existing logical document rather than an unrelated public link.
- [ ] Recipients opening the stable latest link after replacement see the latest version.
- [ ] Any old-version URL behaviour matches the chosen versioning proposal.
- [ ] Non-owners cannot replace another user's page.
- [ ] UI communicates that the existing link will continue to work for recipients.
- [ ] Tests cover owner version creation, non-owner rejection, and stable latest-link resolution after replacement.

## Blocked by

- [04 — List my uploads with useful names](./04-list-my-uploads-useful-names.md)
- [Versioned documents, stable latest links, and replacement](../../versioned-shares/issues/01-versioning-proposal.md)

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
- 2026-05-15 — Reframed replacement as creating a new version; blocked by the consolidated versioning proposal.
