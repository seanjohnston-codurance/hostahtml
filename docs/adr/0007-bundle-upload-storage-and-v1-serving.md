# ADR-0007: Bundle upload storage and V1 serving

Date: 2026-05-13
Status: Accepted

## Context

HostaHTML is moving from single HTML object uploads to page bundles containing HTML plus assets. The existing app-level share token design in ADR-0005 maps a token to one S3 object and redirects to a short-lived presigned URL, but that does not preserve relative asset loading for a multi-file page.

## Decision

Treat every upload as a **bundle**, including single-file HTML uploads. Store bundle files in the private uploads bucket under `{ownerUserId}/{bundleId}/{relativePath}` with no extra `bundles` path segment. Generate `bundleId` as a ULID. New bundle share records store `ownerUserId` and `bundleId`; code derives the S3 prefix from those fields rather than persisting a `bundlePrefix`.

Bundles require a root `index.html`. Single-file HTML uploads are normalized to `{ownerUserId}/{bundleId}/index.html`; zip uploads must already contain a root `index.html`. Upload validation builds an internal manifest of normalized paths, sizes, and content types, writes each object with S3 `ContentType`, ignores common archive noise such as `__MACOSX/**`, `.DS_Store`, and `Thumbs.db`, and rejects root-relative or up-directory references that would escape the token namespace. The `../` pattern is invalid in zip entry paths, served bundle paths, and references found in text-like bundle files; large binary assets are classified by path/content type and are not scanned as UTF-8. The V1 read path keeps `/t/{token}` as the user-facing share URL and serves `/t/{token}/...` through the API/Lambda so relative HTML, CSS, JavaScript modules, images, and other references resolve inside the same token namespace.

## Consequences

- New uploads have one canonical storage/read model instead of separate single-file and bundle paths.
- The strict `index.html` convention is less forgiving than guessing an entrypoint, but it is easy to validate and matches static-site hosting conventions.
- Root-relative and `../` links are rejected up front rather than served broken later; users need to package pages with same-directory or child-directory relative references.
- Lambda serves bundle files in V1, which is simple and preserves private token semantics, but it is not the final high-scale static hosting shape.
- The S3 layout is compatible with a later CloudFront migration where `/t/{token}` authorizes access and redirects to a static runtime path such as `/b/{bundleId}/...`.

## See also

- ADR-0001 — static SvelteKit frontend + dedicated Lambda.
- ADR-0005 — app-level share tokens.
- ADR-0006 — share token identifier: ULID.
- `.scratch/page-workflow-proposals/issues/02-upload-serve-zipped-page-bundle.md`
