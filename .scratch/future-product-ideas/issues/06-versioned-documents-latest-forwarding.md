# 06 — Proposal: versioned documents with latest-link forwarding

Status: needs-triage

Suggested model: **Human** — product and security review before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

Related proposals:

- [Versioned files and links](../../versioned-shares/issues/01-versioning-proposal.md)
- [Stable page link forwards to latest version](../../page-workflow-proposals/issues/05-stable-link-latest-version-proposal.md)

## What to build

Explore a versioning model where each document version has a dedicated URL, while a normal shared token resolves to the latest version automatically. The proposal should define the relationship between logical document ids, immutable version ids, public URLs, expiry, auditability, and whether old versions remain available to recipients.

## Acceptance criteria

- [ ] Decide whether a share token identifies a logical document, a specific version, or both via different URL shapes.
- [ ] Define how old-version URLs are created, displayed, shared, expired, and revoked.
- [ ] Define what "latest" means when a token is forwarded or opened after a replacement.
- [ ] Document whether recipients can tell they were forwarded to a newer version.
- [ ] Decide how versioning interacts with tracking, per-recipient links, and open-count limits.
- [ ] Merge, supersede, or narrow the existing versioned-share proposals before opening implementation tickets.

## Blocked by

- [Versioned files and links](../../versioned-shares/issues/01-versioning-proposal.md)
- [Stable page link forwards to latest version](../../page-workflow-proposals/issues/05-stable-link-latest-version-proposal.md)

## Comments

- 2026-05-15 — Captured from a future-work idea: version documents, link to previous versions via dedicated URLs, and forward the shared token to the latest version automatically.

