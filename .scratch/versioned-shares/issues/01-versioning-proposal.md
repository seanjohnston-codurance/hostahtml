# 01 — Proposal: reintroduce versioning for files / share links

Status: needs-triage

Suggested model: **Human** — product and security review before any `ready-for-agent` breakdown.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Versioned files and links (exploratory)

## Problem

Today each upload creates a **new** S3 object under a new key. There is no stable **logical document** id across replacements: “edit and re-upload” is a new link and a new object. The uploads bucket is also **unversioned** at the S3 layer (see existing hygiene notes under `.scratch/lockdown-and-tokens/`).

Once **ADR-0005** / **ADR-0006** ship, the user-visible id becomes a **ULID-backed share token** that still points at **one** `s3Key` for its lifetime. Replacing file contents without changing the URL is **out of scope** of phase 1.

Some users will want:

- **Stable URL** — same share link after uploading a corrected HTML file.
- **History** — optional prior revisions retained for audit or rollback.
- **Clarity** — distinguish “this link” (logical doc) from “this bytes-at-time-T” (revision).

## Proposal directions (pick later; mutually combinable)

1. **Logical share + revision pointer**  
   Keep the public token (or introduce a shorter “slug”) as the stable id. DynamoDB holds `currentS3Key` plus optional `revisions[]` or a separate revision table. `POST` upload to an **existing** share (authenticated owner) updates pointer and optionally archives the old object under a versioned key before lifecycle deletes it.

2. **Immutable revisions, new URL per version**  
   Stable “document” id in metadata only; each revision gets its own share token or path suffix (`/t/{token}/3`). Simple mental model; bookmarks point at explicit revisions.

3. **S3 versioning on the uploads bucket**  
   Bucket-level versioning for accidental overwrite protection; orthogonal to **URL** stability unless combined with (1) or (2). Cost and lifecycle rules need explicit design (version expiry vs object expiry).

## Constraints and ADR touchpoints

- **ADR-0003** — 7-day TTL is product law today; versioning must not silently extend public access unless policy and lifecycle are updated together.
- **ADR-0005** — token table and `GET /t/{token}` are the right seam for “what bytes does this link resolve to now?”
- **ADR-0006** — ULID identifies a **share row**, not necessarily a single revision forever; any schema change should say whether ULID = one revision only or = logical doc.

## Open questions

- Who may **overwrite** a share (same org only; owner from JWT `sub`; both)?
- Should old revisions remain **GET**-able by URL, or only by support/admin tools?
- Does **CloudFront phase 2** (same-origin `/t/*`) change URL design for version suffixes?
- How do we communicate **expiry** when the logical doc outlives individual S3 objects?

## Acceptance criteria (for a future “spec ready” issue, not this proposal)

- [ ] Chosen model documented in a new or amended ADR (or ADR-0005 addendum).
- [ ] Data model for logical id, revision id, `s3Key`(s), and TTL alignment with **ADR-0003**.
- [ ] API sketch: create vs replace vs list revisions; auth rules.
- [ ] S3 lifecycle / versioning cost note.
- [ ] Split into `ready-for-agent` vertical slices.

## Blocked by

None — proposal only. Implementation should wait until triage promotes a follow-up spec issue.

## User stories (aspirational)

- As a user, I can **fix a typo** in my HTML and keep the **same share link** for recipients.
- As a user, I can optionally **see or restore** an older revision if we choose to support history.

## Comments

- 2026-05-13 — Issue opened as proposal alongside ADR-0005/0006 documentation work.
