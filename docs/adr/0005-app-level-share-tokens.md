# ADR-0005: App-level share tokens (phased migration from long presigned URLs)

Date: 2026-05-12  
Status: Accepted  
Last reviewed: 2026-05-13

## Context

Successful uploads today return a **7-day S3 presigned GET URL** generated in Lambda (see **ADR-0003** for TTL alignment with lifecycle and product copy). That URL embeds AWS signing material and is long-lived in logs, support tickets, and browser history.

Constraints:

- Presigned URLs are bounded by IAM / SigV4 practical limits; product TTL is intentionally short (7 days).
- Static hosting stays on S3 + CloudFront per **ADR-0001**; the API remains the security boundary for writes.
- We want shorter client-visible URLs, room for revocation and analytics later, and to avoid raw presigned URLs in the UI without changing the 7-day storage policy.

**Implementation note:** Until phase 1 is deployed, production may still return long presigned URLs from `POST /upload`. The sections below are **normative** for phase 1 onward. Work is tracked in [`.scratch/lockdown-and-tokens/issues/05-implement-app-tokens-phase-1-per-adr.md`](../../.scratch/lockdown-and-tokens/issues/05-implement-app-tokens-phase-1-per-adr.md).

## Decision

Introduce **app-owned opaque share tokens** backed by **DynamoDB** as the system of record for “which object does this token resolve to,” with a **public read path** on the HTTP API that validates the token in Lambda and responds with **302** to a **short-lived** presigned S3 GET URL (minutes), with **`Cache-Control: private, no-store`** on the redirect. **`POST /upload`** returns an absolute **`{SHARE_BASE_URL}/t/{token}`** in `UploadResponse.url` and does **not** expose a 7-day presigned URL to the client.

Share **token format** (length, alphabet, time-ordering) is specified in **ADR-0006**.

### Data model (machine-checkable)

| Attribute   | Type        | Notes |
| ----------- | ----------- | ----- |
| `token`     | String (PK) | Opaque public id; format and validation in **ADR-0006**. Not the S3 key. |
| `s3Key`     | String      | Upload object key as today (`{userId}/{uuid}-…`). |
| `createdAt` | Number      | Unix epoch seconds. |
| `expiresAt` | Number      | Unix epoch seconds; must align with **ADR-0003** (7 days from creation) unless product policy changes. |
| `revoked`   | Boolean     | Optional; default false. Not required for phase 1. |

Indexes: primary key `token`. **DynamoDB TTL** on `expiresAt` for row cleanup (eventual consistency is acceptable alongside S3 lifecycle).

### Public GET path

- **`GET /t/{token}`** on the HTTP API (same API as `POST /upload`).
- Behaviour: if the token exists, is unexpired (`expiresAt` in the future), and is not revoked (when that field exists), respond with **302** to a fresh presigned `GetObject` URL whose **`expiresIn`** is short (order of **minutes**). Set **`Cache-Control: private, no-store`** on the redirect response.
- Invalid, unknown, malformed, or expired token: **404** with a generic body (no oracle).

### CloudFront

Today the distribution serves only the static site. **Phase 2+:** add a behaviour (path prefix `/t/*` or a dedicated hostname) whose origin is **API Gateway** (Lambda) while the default behaviour remains S3 for static assets—consistent with **ADR-0001** (API stays separate from static).

### Phases

| Phase | Scope | Done when |
| ----- | ----- | --------- |
| **0** | ADR accepted; issues unblocked | ADR-0005 **Accepted**; ADR-0006 in place for token format. |
| **1** | DynamoDB table; `POST /upload` mints token and returns **`{SHARE_BASE_URL}/t/{token}`**; **`GET /t/{token}`** resolves and 302s to short-lived presign | E2E: upload → open share URL → HTML loads until TTL; tests green. |
| **2** | CloudFront routes `/t/*` to API in production so links can use the **site** origin where desired | Single-origin share links in prod. |
| **3** | Optional: listing, revocation, metrics; tighten logging (no long presigned URLs in app logs) | Product/security acceptance. |

### TTL and presign

- **Object lifetime** remains governed by **ADR-0003** (S3 lifecycle + product copy); **`expiresAt`** on the token row stays in sync with that 7-day policy so tokens do not outlive objects.
- **Per-request presigned URLs** used only for the redirect stay **short-lived** (minutes). The **7-day** promise is carried by the **app token + S3 object**, not by a single long-lived presigned URL shown to users.

## Consequences

**Positive:**

- User-visible URLs are short, opaque, and can be revoked or extended at the app layer in later phases.
- Presigned URLs used on read can be rotated or shortened without changing the share id users bookmark.

**Negative:**

- New datastore (DynamoDB), TTL design, and (in phase 2) CloudFront behaviour complexity.
- Cold path on every share open (Lambda + S3 redirect).

## See also

- **ADR-0001** — static frontend + dedicated Lambda; share reads stay API-backed.
- **ADR-0003** — 7-day TTL alignment; token `expiresAt` must stay in sync with that policy.
- **ADR-0006** — share token identifier: ULID.

## Reconsider if

- Product requires **permanent** public links (would conflict with ADR-0003 lifecycle unless policy changes).
- Traffic or cost makes per-open Lambda unacceptable (then evaluate edge key validation or signed cookies—out of scope here).
