Status: ready-for-agent

# Persist draft state on shares

## What to build

Bake draft/not-for-circulation status into the share model so users can create a draft share without manually editing the share URL. Draft shares should carry the status in the token metadata, show draft status in the upload result, and automatically watermark HTML responses whenever the share is opened.

## Acceptance criteria

- [ ] Uploads can opt into draft status without changing the raw file upload body contract.
- [ ] New share token records persist whether the share is a draft, with missing draft metadata treated as non-draft for existing tokens.
- [ ] Upload responses expose draft status in a backwards-compatible way for frontend consumers.
- [ ] The upload UI lets a signed-in user create a draft share and clearly labels the resulting link as draft/not for circulation.
- [ ] Draft share HTML responses are watermarked without requiring a query parameter, while non-draft shares remain unchanged.
- [ ] API and frontend behavior is covered by focused tests and documented in the changelog.

## Blocked by

- 01-query-param-draft-watermark
