Status: ready-for-agent

# Query-param draft watermark preview

## What to build

Allow a shared site to be previewed as a draft by adding a query parameter to the existing share URL. This should be a transient local/testing affordance, not persisted metadata: opening a valid shared HTML page with the draft query flag shows a large branded "DRAFT / NOT FOR CIRCULATION" watermark, while opening the same link without the flag behaves as it does today.

## Acceptance criteria

- [ ] `GET /t/{token}?draft=1` and nested bundle paths such as `GET /t/{token}/...?draft=1` render HTML responses with an obvious fixed watermark.
- [ ] The bare bundle redirect from `/t/{token}?draft=1` preserves the draft flag when redirecting to `/t/{token}/?draft=1`.
- [ ] Non-HTML bundle assets are not modified by the draft watermark behavior.
- [ ] Existing non-draft share links behave unchanged.
- [ ] The user-facing behavior is covered by focused API tests and documented in the changelog.

## Blocked by

None - can start immediately
