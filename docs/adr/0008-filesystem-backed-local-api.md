# ADR-0008: Filesystem-backed local API

Date: 2026-05-13
Status: Accepted

## Context

The SvelteKit frontend can run locally, but useful end-to-end development still depends on the deployed backend. The API Lambda currently talks directly to AWS service clients from `api/src/upload.ts`, `api/src/shareResolve.ts`, and `api/src/shareTokens.ts`: S3 stores uploaded bundle files and DynamoDB stores app-level share token records.

That is the right production shape per ADR-0005 and ADR-0007, but it makes daily feedback slower. A developer should be able to run the Lambda-compatible API locally, upload a single HTML file or zipped bundle from the local frontend, and open the returned `/t/{token}` link without provisioning AWS resources.

## Decision

Provide a local development API runner for the existing Lambda handler and back it with filesystem storage. Production remains S3 + DynamoDB. Local mode is explicit and opt-in.

The local backend preserves the same app-level contracts as production:

- `POST /upload` accepts the same upload request shape and returns the same `UploadResponse`.
- `GET /t/{token}` and `GET /t/{token}/...` keep the token namespace and bundle serving behaviour.
- Bundle files keep the canonical layout `{ownerUserId}/{bundleId}/{relativePath}`.
- Token records keep `createdAt`, `expiresAt`, `draft`, `revoked`, `ownerUserId`, and `bundleId` semantics.
- Content types and draft watermark behaviour match production.

Use plain filesystem documents for local persistence:

- Bundle objects are real files under a local dev-data root.
- Object metadata such as `ContentType` is stored alongside object bodies.
- Share token records are JSON documents keyed by token.

Do not introduce SQLite for the first local version. A document store is enough because local share resolution only needs key-value lookup by token. SQLite remains available later if local development needs queries, migrations, or stronger transactional behaviour.

## Migration path

Introduce narrow object-store and share-token-store ports around the API's persistence needs. The initial implementations are:

- AWS adapters backed by S3 and DynamoDB, preserving production behaviour.
- Filesystem adapters backed by the local dev-data directory.

Future implementations can be added without changing upload validation, bundle construction, share-token semantics, or the frontend contract. In particular:

- A LocalStack implementation can use the same ports with S3 and DynamoDB endpoints for closer AWS parity.
- The filesystem implementation can remain the fast default for daily local work.
- If the API grows enough that environment-selected module singletons become awkward, move to explicit dependency construction around the Lambda handler while keeping the same ports.

## Consequences

**Positive:**

- Frontend and API can be exercised together without deployed AWS resources.
- The local path stays cheap and simple: no Docker or database server required.
- The storage boundary becomes clearer, making later LocalStack or alternative persistence swaps easier.

**Negative:**

- The API gains a small abstraction layer around storage.
- Filesystem behaviour is not a full S3 or DynamoDB emulator. It will not catch every IAM, request signing, consistency, or service-specific edge case.
- Local auth needs an explicit development-only path so uploads can be tested without Google sign-in.

## Reconsider if

- Local filesystem mode drifts from production semantics often enough to hide bugs.
- Developers need to test AWS-specific behaviour such as IAM policy, S3 metadata quirks, DynamoDB TTL, or SDK endpoint configuration.
- Local workflows require token queries, listing, or transactional updates that are awkward as JSON documents.

## See also

- ADR-0001 — static SvelteKit frontend + dedicated Lambda.
- ADR-0005 — app-level share tokens.
- ADR-0007 — bundle upload storage and V1 serving.
