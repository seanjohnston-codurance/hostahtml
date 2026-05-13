# 04 — List my uploads with useful names

Status: needs-triage

Suggested model: **AFK after metadata design** — likely implementable once upload metadata exists.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

Give signed-in users an overview of their uploads. Each item should have a useful display name, ideally derived from the uploaded page title when available, with a sensible fallback such as original filename or upload timestamp.

## Acceptance criteria

- [ ] Signed-in user can see a list of their own uploads.
- [ ] Uploads belonging to other users are not shown.
- [ ] Each upload has a display name derived from the HTML `<title>` when one is available.
- [ ] Uploads without a usable title get a clear fallback name.
- [ ] The list shows enough context for the user to identify an upload, such as created time, expiry, or current share link status.
- [ ] Tests cover owner-only listing and title fallback behaviour.

## Blocked by

- App-level share-token or upload metadata storage being available.

## Comments

- 2026-05-13 — Opened from loose product proposal sketch.
