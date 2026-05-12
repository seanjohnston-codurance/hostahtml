# 04 — ADR: app-level share tokens

Status: done

Suggested model: **composer-2-fast** (structured doc; use Sonnet if trade-off section grows)

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Add `docs/adr/` entry (renumber if `0005` taken) specifying Dynamo token table shape, public GET path (e.g. `/t/{token}`), CloudFront routing to API/Lambda, phased migration away from client-visible long presigned URLs, and how app-owned TTL addresses STS/presign limits. Cross-link ADR-0001 and ADR-0003 where relevant.

## Acceptance criteria

- [ ] ADR file exists under `docs/adr/` with machine-checkable schema and phases.
- [ ] References existing ADRs for static hosting and TTL alignment.
- [ ] No implementation required in this slice (doc only).

## Blocked by

None — can start immediately.

## User stories covered

- As implementer, I have a single source of truth before building Dynamo/API/CloudFront slices.

## Comments
