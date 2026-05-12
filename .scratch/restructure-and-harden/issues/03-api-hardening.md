# 03 — API refactor + hardening (TDD)

Status: ready-for-agent

Depends on: issue 02 (relocation must have landed).

## Motivation

Three smells in the current Lambda handler:

- **JWT verification round-trips to Google** on every request (`oauth2.googleapis.com/tokeninfo`). Adds ~150 ms of latency we don't need. Switch to local JWKS-based verification via `google-auth-library`, which caches keys in module scope across warm invocations.
- **No size validation** — API Gateway's body limit is the only ceiling. Decode the API Gateway event body first, then cap decoded bytes at 5 MB.
- **No content validation** — anything can be uploaded with `Content-Type: text/html`. Decode the API Gateway event body first, then sniff the first 1 KB of decoded bytes for `<html`, `<!doctype`, or `<body>` (case-insensitive).

Also: split the monolithic handler into focused modules so each is testable.

## Scope

Add `google-auth-library@^9` to `api/package.json`. Split `api/src/handler.ts` into:

### `auth.ts`

```ts
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;

export async function verifyGoogleToken(token: string): Promise<string> {
  const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('no sub claim');
  return payload.sub;
}
```

**Tests** (`auth.test.ts`): mock `OAuth2Client.verifyIdToken`; assert correct audience is passed; assert error when payload missing.

### `validate.ts`

```ts
const MAX_BYTES = 5_000_000;
const HTML_HINTS = /<html|<!doctype|<body/i;

export function validateUpload(body: Buffer): void {
  if (body.length > MAX_BYTES) throw new Error(`File too large (${body.length} > ${MAX_BYTES})`);
  const head = body.subarray(0, 1024).toString('utf8');
  if (!HTML_HINTS.test(head)) throw new Error('Body does not look like HTML');
}

export function decodeBody(body: string | undefined, isBase64Encoded: boolean): Buffer {
  return isBase64Encoded
    ? Buffer.from(body ?? '', 'base64')
    : Buffer.from(body ?? '', 'utf8');
}
```

**Tests** (`validate.test.ts`): accepts `<!doctype html>` buffer; rejects empty buffer; rejects 6 MB decoded buffer; rejects binary blob; decodes both plain UTF-8 and base64 API Gateway bodies before validation.

### `upload.ts`

Orchestrates: parse Bearer token → `verifyGoogleToken` → decode API Gateway body using `isBase64Encoded` → `validateUpload` → S3 put → presigned URL. Returns `UploadResponse` from `@hostahtml/shared`.

**Tests** (`upload.test.ts`): mock `S3Client.send` and `verifyGoogleToken`. Cover:
- 401 on missing token
- 401 on bad token
- 413 on oversized decoded body
- 415 on non-HTML decoded body
- 200 with `UploadResponse` shape on success
- both plain and base64-encoded API Gateway event bodies are handled correctly

### `handler.ts` (dispatch only)

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleUpload } from './upload';

export const handler = async (e: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const { method } = e.requestContext.http;
  const path = e.rawPath;
  if (method === 'GET' && path === '/') return { statusCode: 200, body: '{"status":"ok"}' };
  if (method === 'POST' && path === '/upload') return handleUpload(e);
  return { statusCode: 404, body: '{"error":"Not found"}' };
};
```

**Tests** (`handler.test.ts`): dispatches `/upload` to `handleUpload`; returns 404 for unknown paths; returns 200 for `/`.

## TDD workflow

Red → green → refactor per module. Write `auth.test.ts` first, watch it fail, write `auth.ts`. Then `validate.ts`, then `upload.ts`, then `handler.ts`. Never write source before the failing test.

## Out of scope

- Per-user rate limiting (see ADR-0002).
- DynamoDB-backed metadata (deferred to listing/deletion work).
- Frontend changes.

## Acceptance

- [ ] `npm run test -w api` — all unit tests green.
- [ ] `api/src/handler.ts` is ≤20 lines (dispatch only).
- [ ] No call to `oauth2.googleapis.com/tokeninfo` anywhere in `api/`.
- [ ] Manual smoke test post-deploy: 6 MB upload → 413; non-HTML upload → 415; valid HTML → 200 + URL.

## Comments
