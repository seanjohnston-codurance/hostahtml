# 01 — Upload validation: HTML sniff (strict/BOM), 5 MB decoded cap, decode path, early 413

Status: ready-for-agent

Type: AFK

## Parent

[PRD](../PRD.md) — HTML upload sniff alignment

## Scope

This ticket is **implementation work** in the API upload path: HTML sniff (default vs `STRICT_HTML_SNIFF`, BOM), **decoded body size**, **how bodies are decoded** (UTF-8 vs base64), **early 413** from `Content-Length`, and tests. It is not a documentation-only ADR ticket — the sections below are **constraints and context** so the implementer does not change size/decode behaviour by accident while fixing sniff.

## Background: decoded size cap (5 MB)

- **Normative limit:** `MAX_UPLOAD_BYTES` in `api/src/validate.ts` is **5_000_000** decoded octets. `validateUpload` checks `body.length` **after** `decodeBody` has produced a `Buffer`.
- **Semantics:** The cap applies to the **decoded** payload held in Lambda memory (not transport encoding overhead). Oversize throws from `validateUpload`; `handleUpload` maps messages starting with `File too large` to **413** with a JSON body.
- **Product / platform:** Fits a “small HTML share” tool; it is **not** a substitute for CDN/WAF maximum object policies. **Stage-level** throttling on the HTTP API is defined in `infra/lib/hostahtml-stack.ts`; per-user limits are deferred per **ADR-0002**.

## Background: UTF-8 vs base64 (`isBase64Encoded`)

- **API Gateway HTTP API v2:** The Lambda event may carry `body` as a **UTF-8 string** (`isBase64Encoded: false`) or as a **base64 string** (`isBase64Encoded: true`), per platform rules.
- **`decodeBody`:** Uses `Buffer.from(body ?? "", "utf8")` vs `Buffer.from(body ?? "", "base64")` — the full string is decoded in **one** allocation today (no streaming).
- **Implication:** Sniff and size checks run **after** full decode. There is no incremental “sniff first KB without decoding” path.

## Background: early 413 from `Content-Length`

- **Where:** `handleUpload` reads `getContentLength` (case-insensitive `content-length` / `Content-Length`) **before** `decodeBody`.
- **Plain body:** If `!isBase64Encoded` and declared length `> MAX_UPLOAD_BYTES` → **413** without decoding a body that honestly declares itself oversized.
- **Base64 body:** Uses an upper bound `ceil(declaredLen * 3 / 4)` on the declared length (see comment in `api/src/upload.ts`). **Caveat:** HTTP `Content-Length` is the **message** length; how that relates to the base64 string length in the Lambda event can be environment-specific. Treat this branch as a **conservative early reject**, not a proof of decoded size — **`validateUpload` after decode remains authoritative**.
- **Limitations (do not over-promise):**
  - If `Content-Length` is **missing**, **malformed** (so `parseInt` skips early reject), or **dishonest** (declared small, actual body large), the handler still **decodes** up to API Gateway / Lambda payload limits. Early 413 is **best-effort** CPU/memory optimisation for honest declarations, **not** a guarantee that oversized bodies are never decoded.
  - **Duplicate or combined headers:** `getContentLength` uses `parseInt` on the header value as returned; combined values can parse oddly — weakness of the **early** path only; post-decode size check still applies.

## Background: abuse / “DDoS” framing (accurate)

- **What early 413 helps:** Reduces **CPU and memory** when clients honestly declare an oversized `Content-Length`, before `Buffer.from` allocates a huge buffer for that path.
- **What it does not replace:** **JWT authentication** on upload, **API Gateway stage throttling**, and account-level AWS limits. There is **no** per-IP logic inside Lambda. Attackers can still force work up to **platform max payload** when headers lie or are absent.
- **Out of scope for this ticket:** Raising API Gateway / WAF / CloudFront limits; streaming or chunked decode (not how this integration is built today). Split a **follow-up** if product needs streaming or stricter edge controls.

## Out of scope (implementation PR)

- Changing API Gateway / WAF / CloudFront limits.
- New env vars or new per-user rate limits (defer to **ADR-0002** follow-ups unless explicitly pulled into this ticket).

## What to build

The upload pipeline rejects non-HTML with a **415** after decoding the body. Today **default** mode strips a UTF-8 BOM and leading ASCII whitespace before running the hint regex on the first 1 KiB, while **`STRICT_HTML_SNIFF`** requires the raw buffer’s first byte to be `<` — so **the same file** (BOM + valid `<html>…`) passes default sniff but **fails strict**. That mismatch has confused reviews and anyone toggling the flag.

Address this **in code**: pick one coherent rule for strict mode, implement it in the upload validation path, and prove it with Vitest. Prefer the smallest change that preserves a meaningful “strict” switch (e.g. strict still means “stricter than default” in a way operators can predict — such as stripping **only** the UTF-8 BOM before the leading-byte check, then applying the same 1 KiB hint test as default, **or** another clearly defined delta you can justify in the PR description). While touching this area, **preserve** the 5 MB decoded cap, UTF-8/base64 decode semantics, and early-413 behaviour documented above unless this ticket explicitly changes them with tests and PR rationale.

If strict mode is not used anywhere in deployed environments, an alternative acceptable outcome is to **remove** `STRICT_HTML_SNIFF` and its branch entirely **only if** you confirm no consumers rely on it; otherwise align behaviour as above.

## Acceptance criteria

- [ ] **Issue tracker:** This file’s title and slug reflect full scope (sniff + size/decode/413); **done** for the markdown rename that landed before implementation.
- [ ] `STRICT_HTML_SNIFF` behaviour is **consistent with default sniff** on the BOM + valid HTML case (either both accept UTF-8 BOM-prefixed HTML, or both reject — no accidental “strict is harsher only on BOM” unless explicitly documented in the PR and in a short comment above the branch).
- [ ] `api/src/validate.test.ts` (and any affected upload tests) cover: default sniff with BOM; strict sniff with BOM; at least one case where strict is **stricter** than default if that distinction remains.
- [ ] **Issue body constraints** remain accurate after the change: 5 MB **decoded** cap, post-decode sniff, `decodeBody` UTF-8 vs base64, early 413 rules and limitations, and honest abuse/throttle framing (update this section if behaviour intentionally changes).
- [ ] `npm run test -w api` passes; `npm run check -w api` passes.
- [ ] *(Optional)* Add or adjust tests for **Content-Length** edge cases if this PR fixes any of the documented early-path weaknesses; otherwise leave as a future ticket.

## Blocked by

None — can start immediately.

## User stories covered

- As an operator, turning on strict sniff does not reject valid HTML that default sniff accepts for the only reason that a UTF-8 BOM is present.
- As security/review, HTML sniff rules are one predictable story, enforced by tests.
- As an operator, documented size/decode/413 behaviour matches what ships so capacity and abuse discussions stay grounded.

## Comments
