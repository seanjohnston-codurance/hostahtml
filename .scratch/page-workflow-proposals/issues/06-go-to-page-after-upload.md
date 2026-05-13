# 06 — Open uploaded page after successful upload

Status: needs-triage

Suggested model: **AFK** — small UX improvement with low product risk.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

After a successful upload, show a "Go to page" action alongside the share link so the uploader can open their uploaded page directly without copying and pasting their own URL.

## Acceptance criteria

- [ ] Successful upload state includes a visible "Go to page" action.
- [ ] The action opens the URL returned by the upload response.
- [ ] Existing copy-link behaviour remains available.
- [ ] The action is not shown before a successful upload.
- [ ] Tests cover the button appearing only after success and pointing at the returned URL.

## Blocked by

None — can start immediately once promoted.

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
