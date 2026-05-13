# 02 — Upload and serve a zipped page bundle

Status: needs-triage

Suggested model: **AFK after proposal** — should become `ready-for-agent` only after the package upload proposal is accepted.

Type: **Implementation candidate**

## Parent

[PRD](../PRD.md) — Page workflow proposals

## What to build

Let an authenticated user upload a page bundle, receive one share link, and open the shared page with its referenced assets loading correctly. This should be a narrow end-to-end slice through upload validation, storage, share resolution, and frontend success UI for the chosen bundle format.

Per ADR-0007, every upload should be stored as a bundle under `{ownerUserId}/{bundleId}/{relativePath}`. Zip bundles must contain a root `index.html`; existing single-file HTML uploads should be normalized to `{ownerUserId}/{bundleId}/index.html`.

## Acceptance criteria

- [ ] User can upload a valid page bundle using the input model chosen in the package upload proposal.
- [ ] The bundle is rejected with a useful error when no root `index.html` is present.
- [ ] Bundle IDs are opaque ULIDs.
- [ ] Referenced assets inside the bundle are stored and served so relative paths from the entry HTML work.
- [ ] Stored assets include appropriate S3 `ContentType` metadata.
- [ ] Common archive noise such as `__MACOSX/**`, `.DS_Store`, and `Thumbs.db` is ignored.
- [ ] Unsafe paths, obvious root-relative references, and up-directory references such as `../` are rejected at upload time with useful errors.
- [ ] Served bundle paths reject absolute-path syntax and any `..` segment before deriving S3 keys.
- [ ] Text-like files are scanned for escaping references; large binary assets are not decoded as text during validation.
- [ ] Partial upload failures trigger best-effort cleanup of the bundle prefix and any created token record.
- [ ] Existing single-file HTML upload behaviour remains supported unless the proposal explicitly changes it.
- [ ] Tests cover a successful bundle upload and at least one rejected invalid bundle.
- [ ] A manual smoke test can upload a tiny bundle and open the resulting share link.

## Blocked by

None — the package upload model is documented in ADR-0007.

## Comments

- 2026-05-13 — Opened as an implementation candidate pending package upload design.
