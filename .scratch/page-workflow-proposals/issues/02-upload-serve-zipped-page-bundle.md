# 02 — Upload and serve a zipped page bundle

Status: needs-triage

Suggested model: **AFK after proposal** — should become `ready-for-agent` only after the package upload proposal is accepted.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

Let an authenticated user upload a page bundle, receive one share link, and open the shared page with its referenced assets loading correctly. This should be a narrow end-to-end slice through upload validation, storage, share resolution, and frontend success UI for the chosen bundle format.

## Acceptance criteria

- [ ] User can upload a valid page bundle using the input model chosen in the package upload proposal.
- [ ] The bundle is rejected with a useful error when no valid entry HTML file can be determined.
- [ ] Referenced assets inside the bundle are stored and served so relative paths from the entry HTML work.
- [ ] Existing single-file HTML upload behaviour remains supported unless the proposal explicitly changes it.
- [ ] Tests cover a successful bundle upload and at least one rejected invalid bundle.
- [ ] A manual smoke test can upload a tiny bundle and open the resulting share link.

## Blocked by

- [01 — Proposal: package uploads for HTML plus assets](./01-package-uploads-proposal.md)

## Comments

- 2026-05-13 — Opened as an implementation candidate pending package upload design.
