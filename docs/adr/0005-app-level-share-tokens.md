# ADR-0005: App-level share tokens (phased migration from long presigned URLs)

Date: 2026-05-12  
Status: Proposed

## Context

Today, successful uploads return a **7-day S3 presigned GET URL** generated in Lambda (see **ADR-0003** for TTL alignment with lifecycle and product copy). That URL embeds AWS signing material and is long-lived in logs, support tickets, and browser history.

Constraints:

- Presigned URLs are bounded by IAM / SigV4 practical limits; product TTL is intentionally short (7 days).
- Static hosting stays on S3 + CloudFront per **ADR-0001**; the API remains the security boundary for writes.
- Future needs: shorter client-visible URLs, revocation, analytics, and avoiding raw presigned URLs in the UI without changing the 7-day storage policy.

## Decision

Introduce **app-owned opaque share tokens** backed by **DynamoDB** (or equivalent) as the system of record for “which object does this token resolve to,” with a **public read path** that validates the token in Lambda (or a thin read Lambda) and issues a **short-lived redirect or presigned URL** (or streams the object for small HTML).

This ADR records the **target shape and phases** only; implementation is tracked in `.scratch/lockdown-and-tokens/issues/05-implement-app-tokens-phase-1-per-adr.md` after this ADR is accepted.

### Data model (machine-checkable)

| Attribute        | Type        | Notes |
| ---------------- | ----------- | ----- |
| `token`          | String (PK) | Opaque, high-entropy (e.g. 128+ bits random, base64url). Not the S3 key. |
| `s3Key`          | String      | Upload object key as today (`{userId}/{uuid}-…`). |
| `createdAt`      | Number      | Unix epoch seconds. |
| `expiresAt`      | Number      | Must align with **ADR-0003** (7 days from creation) unless product policy changes. |
| `revoked`        | Boolean     | Optional; default false. |

Indexes: primary key `token`. Optional GSI on `expiresAt` for TTL / sweeper if not using DynamoDB TTL alone.

### Public GET path

- Example: **`GET /t/{token}`** on the HTTP API (or dedicated read API).
- Behaviour: if token valid and unexpired, respond with **302** to a fresh presigned S3 URL **or** **307** with short `Cache-Control: private, no-store`, **or** inline small HTML for tiny payloads (cap bytes); exact choice is an implementation detail of phase 1.
- Invalid/expired token: **404** (no oracle).

### CloudFront

- Today the distribution serves only the static site. Phase 2+: add a behaviour (path prefix `/t/*` or dedicated hostname) whose origin is **API Gateway** (Lambda) while default behaviour remains S3 for static assets—consistent with **ADR-0001** (API stays separate from static).

### Phases

| Phase | Scope | Done when |
| ----- | ----- | --------- |
| **0** | This ADR + issue breakdown | ADR accepted; issue 05 unblocked. |
| **1** | Dynamo table + `POST /upload` (or follow-up) mints token; response returns **`/t/{token}`** absolute URL (API host) **instead of** exposing the raw presigned URL in JSON (presign may still run server-side for redirect). | E2E: upload → open `/t/{token}` → HTML loads until TTL. |
| **2** | CloudFront routes `/t/*` to API in production so links use the **site origin** where desired. | Single-origin share links in prod. |
| **3** | Optional: listing, revocation, metrics; tighten logging (no long presigned URLs in app logs). | Product/security acceptance. |

### TTL and STS / presign limits

- **Object lifetime** remains governed by **ADR-0003** (S3 lifecycle + presigned expiry + UI copy).
- **Share token `expiresAt`** matches that policy so tokens do not outlive objects.
- **Per-request presigned URLs** used only as an implementation detail (redirect) stay short-lived (minutes) to avoid STS/session assumptions on long presigned chains; the **7-day** promise is carried by the **app token + S3 object**, not by a single 7-day presigned URL shown to users.

## Consequences

**Positive:**

- User-visible URLs are short, opaque, and revocable at the app layer.
- Presigned URLs can be rotated or shortened without breaking stored “share IDs.”

**Negative:**

- New datastore (DynamoDB), TTL/index design, and CloudFront behaviour complexity.
- Cold path on every share open (Lambda + optional S3 redirect).

## See also

- **ADR-0001** — static frontend + dedicated Lambda; share reads stay API-backed.
- **ADR-0003** — 7-day TTL alignment across lifecycle, presign, and copy; token `expiresAt` must stay in sync with that policy.

## Reconsider if

- Product requires **permanent** public links (would conflict with ADR-0003 lifecycle).
- Traffic or cost makes per-open Lambda unacceptable (then evaluate edge key validation or signed cookies—out of scope here).
