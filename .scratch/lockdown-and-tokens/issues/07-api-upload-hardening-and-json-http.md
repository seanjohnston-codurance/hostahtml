# 07 — API upload hardening + JSON HTTP helper + S3 key entropy

Status: done

Suggested model: **composer-2-fast** (default); **Sonnet** if `Content-Length` / base64 edge cases need extra reasoning

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Single API vertical: (1) optional early **413** using `Content-Length` before full decode when safe (plain exact; base64 approximate with code comment). (2) `validate.ts` strips UTF-8 BOM + leading ASCII whitespace before HTML sniff; optional `STRICT_HTML_SNIFF` env with tests. (3) shared `jsonResponse` helper sets `Content-Type: application/json; charset=utf-8` for handler and upload JSON paths. (4) S3 object key includes `crypto.randomUUID()` to avoid same-ms collisions. Vitest proves early 413, BOM sniff, and JSON headers where practical.

## Acceptance criteria

- [ ] Early 413 path tested for oversized declared `Content-Length` (non-base64 at minimum).
- [ ] BOM-prefixed HTML passes sniff; strict mode behaviour tested if implemented.
- [ ] All JSON Lambda responses use helper with correct `Content-Type`.
- [ ] Upload key shape includes UUID segment; test asserts shape.
- [ ] `npm run test -w api` passes.

## Blocked by

None — can start immediately (coordinate merges with issue 01 if both touch `upload.ts`).

## User stories covered

- As reliability, garbage uploads and collision-prone keys are reduced without changing auth story.

## Comments
