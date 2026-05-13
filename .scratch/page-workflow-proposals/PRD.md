# Page workflow proposals

**Status:** exploratory — no product commitment.

This folder collects loose proposal tickets for the next layer of upload and share-page workflow improvements.

Current ideas:

1. Upload packaged pages (`.zip` files and/or browser folders) containing multiple HTML files plus assets.
2. Let users choose or configure how long an uploaded page remains available.
3. Give users an overview of their uploads, ideally named from the page title when available.
4. Let stable links forward to the latest version of a page.
5. Add a direct "Go to page" action after upload so users do not need to copy their own link.
6. Let users upload page bundles from folders when browser support allows it.
7. Make file selection more explicit with a visible picker button, while keeping drag and drop.
8. Explore moving bundle page serving from Lambda to CloudFront-backed static hosting.

These ideas touch existing ADRs around static hosting, app-level share tokens, and the current 7-day TTL policy. Proposal issues should settle product/security choices before implementation issues are promoted to `ready-for-agent`.

## Issues

- [01 — Proposal: package uploads for HTML plus assets](./issues/01-package-uploads-proposal.md)
- [02 — Upload and serve a zipped page bundle](./issues/02-upload-serve-zipped-page-bundle.md)
- [03 — Proposal: configurable page lifetime](./issues/03-configurable-page-lifetime-proposal.md)
- [04 — List my uploads with useful names](./issues/04-list-my-uploads-useful-names.md)
- [05 — Proposal: stable page link forwards to latest version](./issues/05-stable-link-latest-version-proposal.md)
- [06 — Open uploaded page after successful upload](./issues/06-go-to-page-after-upload.md)
- [07 — Replace an existing page from the uploads overview](./issues/07-replace-page-from-overview.md)
- [08 — Upload a page bundle from a folder](./issues/08-upload-folder-page-bundle.md)
- [09 — Add an explicit file picker button](./issues/09-add-explicit-file-picker-button.md)
- [10 — Proposal: CloudFront-hosted bundle pages](./issues/10-proposal-cloudfront-bundle-hosting.md)
