# 02 — Uploads bucket unversioned + empty-bucket script + CloudFront comment

Status: done

Suggested model: **composer-2-fast** (CDK + bash; use Sonnet if CloudFormation versioning transition surprises)

Type: AFK

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Uploads S3 bucket is created without versioning (or versioning suspended per AWS rules); 7-day lifecycle rule remains. A checked-in script empties the uploads bucket of all current objects, delete markers, and noncurrent versions so nothing relies on “eventually” cleanup alone. CloudFront stack comment matches `/200.html` fallback behaviour (no stale SPA/index.html wording).

## Acceptance criteria

- [ ] `UploadsBucket` in CDK has `versioned: false` (or documented `AwsCustomResource` suspend if deploy fails).
- [ ] `scripts/empty-uploads-bucket.sh` (or equivalent) deletes all versions/markers and documents `BUCKET` usage.
- [ ] Stale CloudFront error-response comment fixed in stack source.
- [ ] `cd infra && npx cdk synth` succeeds.

## Blocked by

None — can start immediately.

## User stories covered

- As cost/ops, uploads storage matches the 7-day intent without version pile-up.
- As deployer, I can one-shot purge legacy objects before relying on lifecycle-only.

## Comments
