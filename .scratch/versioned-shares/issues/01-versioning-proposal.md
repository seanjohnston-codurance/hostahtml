# 01 — Proposal: versioned documents, stable latest links, and replacement

Status: needs-triage

Suggested model: **Human** — product and security review before any `ready-for-agent` breakdown.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Versioned files and links (exploratory)

## Problem

Today each upload creates a **new share** with a **new token** and a **new bundle id**. There is no stable **logical document** id across replacements: “edit and re-upload” creates an unrelated public link. Users will reasonably expect replacement from the dashboard to mean "publish a new version of this document" while keeping a stable link for recipients.

**ADR-0005** / **ADR-0006** have shipped the public token shape, and **ADR-0007** has made uploads bundle-backed. A share token currently points at one bundle for its lifetime. Replacing a document, keeping old versions available, or forwarding a stable link to a new latest version remains out of scope of the shipped token/bundle model.

Some users will want:

- **Stable URL** — same share link after uploading a corrected HTML file.
- **History** — optional prior revisions retained for audit or rollback.
- **Dedicated version URLs** — old versions can be linked to directly when policy allows.
- **Latest forwarding** — the normal share token resolves to the latest version automatically.
- **Replacement flow** — from the dashboard, replacing a page creates a new version of the same logical document, not an unrelated upload.
- **Clarity** — distinguish “this link” or “document” from “these bytes at time T.”

## Consolidated related tickets

This issue is now the canonical versioning proposal. It consolidates:

- [Stable page link forwards to latest version](../../page-workflow-proposals/issues/05-stable-link-latest-version-proposal.md)
- [Versioned documents with latest-link forwarding](../../future-product-ideas/issues/06-versioned-documents-latest-forwarding.md)

The dashboard replacement implementation candidate remains separate but should be treated as a versioning slice:

- [Replace an existing page from the uploads overview](../../page-workflow-proposals/issues/07-replace-page-from-overview.md)

## Proposal directions (pick later; mutually combinable)

1. **Logical document + current revision pointer**
   Introduce a logical document id. A stable public URL resolves to the document's current revision. Metadata stores the current `bundleId` plus revision history, either inline or in a separate revisions table. Replacing a page from the dashboard creates a new revision and moves the current pointer.

2. **Immutable version URLs plus latest URL**
   Each revision has a durable version URL, while a normal share URL forwards or resolves to the latest version. This gives recipients a simple current link and gives owners an explicit way to reference old versions.

3. **One token per version, document id behind it**
   Keep share tokens immutable and model "latest" as a document-level route that resolves to the latest share token. This is simpler for token semantics but introduces another public id shape.

4. **S3 versioning on the uploads bucket**
   Bucket-level versioning for accidental overwrite protection. This is orthogonal to user-facing URL versioning unless deliberately combined with the document model. Cost and lifecycle rules need explicit design.

## Constraints and ADR touchpoints

- **ADR-0003** — 7-day TTL is product law today; versioning must not silently extend public access unless policy and lifecycle are updated together.
- **ADR-0005** — token table and `GET /t/{token}` are the right place to decide which bundle a link resolves to.
- **ADR-0006** — ULID identifies today’s share token; versioning must decide whether that token means logical document, latest pointer, immutable revision, or a mix through different URL shapes.
- **ADR-0007** — revisions should point at bundle ids, not single S3 keys.
- **ADR-0009** — dashboard listing is the owner-facing entry point for replacement/version management.

## Open questions

- Who may **overwrite** a share (same org only; owner from JWT `sub`; both)?
- Should old revisions remain **GET**-able by public URL, owner-only URL, or only support/admin tooling?
- Does opening the stable link after replacement silently show the latest version, show a notice, or offer version choice?
- Do old version URLs consume their own expiry/open-count/privacy policy, or inherit from the logical document?
- How should recipient-specific links and analytics attach to a document versus a revision?
- Does **CloudFront phase 2** (same-origin `/t/*`) change URL design for version suffixes?
- How do we communicate **expiry** when the logical document outlives individual bundle objects?

## Acceptance criteria (for a future “spec ready” issue, not this proposal)

- [ ] Chosen model documented in a new or amended ADR (or ADR-0005 addendum).
- [ ] Data model for logical document id, revision id, share token(s), bundle id(s), and TTL alignment with **ADR-0003**.
- [ ] URL model documented for stable latest link, dedicated old-version links, and any redirects/forwarding.
- [ ] API sketch: create document, replace/create revision, resolve latest, resolve version, list versions; auth rules included.
- [ ] Dashboard replacement flow defined as "create a new version" of an existing document.
- [ ] Behaviour for old revisions documented: inaccessible, owner-only, public by version URL, or retained only for rollback.
- [ ] S3 lifecycle / versioning cost note, including whether S3 bucket versioning is part of the design.
- [ ] Interaction notes for tracking, per-recipient links, open-count limits, and CloudFront bundle hosting.
- [ ] Split into `ready-for-agent` vertical slices.

## Blocked by

None — proposal only. Implementation should wait until triage promotes a follow-up spec issue.

## User stories (aspirational)

- As a user, I can **fix a typo** in my HTML and keep the **same share link** for recipients.
- As a user, I can **replace a page from my dashboard** and know this creates a new version.
- As a user, I can optionally **see, link to, or restore** an older revision if we choose to support history.

## Comments

- 2026-05-13 — Issue opened as proposal alongside ADR-0005/0006 documentation work.
- 2026-05-15 — Consolidated stable latest-link forwarding, dedicated old-version URLs, and dashboard replacement into this canonical versioning proposal.
