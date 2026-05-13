# 01 — Proposal: package uploads for HTML plus assets

Status: needs-triage

Suggested model: **Human** — product, security, and serving model review before any `ready-for-agent` breakdown.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

Decide how HostaHTML should accept multi-file pages: uploaded `.zip` archives, browser folder uploads, or both. The proposal should define the user-facing upload flow, the rule for choosing the entry HTML file, how relative asset paths are preserved, and what validation limits apply to the package as a whole.

The outcome should be a short implementation-ready design, not code.

## Acceptance criteria

- [ ] Chosen input model documented: `.zip`, folder upload, or both.
- [ ] Entry HTML selection rule documented, including what happens when a package contains multiple candidate HTML files.
- [ ] Asset path and serving expectations documented for relative links, images, CSS, scripts, and nested directories.
- [ ] Validation limits documented for decoded package size, file count, allowed file types, and unsafe paths such as absolute paths or `..` traversal.
- [ ] Security notes cover HTML sniffing, decompression bombs, and whether active assets are allowed.
- [ ] Follow-up implementation tickets are split into independently verifiable slices.

## Blocked by

None — proposal only.

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
- 2026-05-13 — Proposal outcome documented in ADR-0007: V1 accepts `.zip` bundles with root `index.html`; browser folder upload is split to issue 08.
