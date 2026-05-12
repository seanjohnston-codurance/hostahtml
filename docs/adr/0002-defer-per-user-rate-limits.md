# ADR-0002: Defer per-user rate limits until DynamoDB lands

Date: 2026-05-12
Status: Accepted

## Context

The api has no rate limiting today. A misbehaving Codurance user (or a typo in a script) could call `POST /upload` repeatedly and burn through Lambda + S3 budget.

Two implementation paths:

1. **API Gateway HTTP API v2 stage route throttle.** Cheap CDK configuration on the generated stage route settings. Limits the entire stage, not per-user. One bad actor saturates the limit for everyone.
2. **Per-user counter in DynamoDB.** Increment a counter on each upload, reject if the rolling window exceeds the user's quota. Requires shared state across stateless Lambda invocations — i.e. a database.

We have no database today. The planned product features (listing uploaded files, deletion, per-file privacy) will require one — DynamoDB is the natural fit on this stack. That work is on the roadmap but not in flight.

## Decision

**Apply the API Gateway HTTP API v2 stage route throttle now** (5 req/s sustained, 10 burst). **Defer per-user rate limiting** until DynamoDB is introduced for one of the other features.

## Consequences

**Positive:**
- Immediate, cheap protection against typos and runaway loops.
- No new infra dependency yet — DynamoDB lands when it's justified by a second concern as well.

**Negative:**
- A single bad actor can exhaust the stage-level budget for everyone else.
- Mitigated by the small, trusted user base (Codurance staff with Google auth on the org domain).
- When per-user limits eventually land, the stage throttle may be redundant — we'll keep it as a safety floor.

## Reconsider when

- DynamoDB is introduced for listing / deletion / privacy work. At that point, add a per-user uploads counter table with a TTL window and gate uploads on it. Cost is marginal once the table exists.
- We observe stage-throttle saturation in CloudWatch metrics (i.e. a real bad-actor incident).
