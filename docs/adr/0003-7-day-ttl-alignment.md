# ADR-0003: Align S3 lifecycle, presigned URL expiry, and product copy on a single 7-day TTL

Date: 2026-05-12
Status: Accepted

## Context

Three places encode "shared links live for 7 days":

1. **Presigned URL `expiresIn`** in the Lambda — currently `7 * 24 * 60 * 60` seconds, used when calling `getSignedUrl`.
2. **S3 lifecycle rule** on the bucket — being introduced in this round of work (previously absent, which is why storage grew unbounded).
3. **Frontend copy** — "Live for {result.expiresInDays} days" is shown to the user after upload.

These three numbers can drift independently. If the lifecycle were set to 30 days and the URL to 7, we'd be paying for storage of files nobody can access. If the frontend copy says 14 days but the URL expires at 7, users see broken links and assume the tool is buggy.

## Decision

**All three stay pinned to the same 7-day policy.** In this round of work, each layer encodes the same product policy explicitly:

- the Lambda's `getSignedUrl` call (`7 * 24 * 60 * 60` seconds),
- the CDK `LifecycleRule` (`expiration: Duration.days(7)`),
- the response payload's `expiresInDays: 7`, consumed by the frontend.

Changing the policy means updating all three references in the same change. A shared constant can be introduced later if the policy starts changing often, but this ADR does not add that coupling now.

## Consequences

**Positive:**
- The product, URL expiry, and storage lifecycle communicate the same lifetime.
- Users see consistent behaviour: the link expires at the same time the object disappears. No confused tickets about "broken links" that are actually deleted objects.

**Negative:**
- Changing the policy still requires touching the Lambda response/signing code and the CDK lifecycle rule together.
- S3 lifecycle expiration is eventually consistent within ~48 h; a file may live up to two days past its URL expiry. Acceptable — the URL is already dead, so the file is invisible regardless.

## See also

- ADR-0005 (app-level share tokens; token TTL stays aligned with this ADR’s 7-day policy)

## Reconsider if

- The product requires differentiated TTLs (e.g. paid tier with 30-day links, free with 7).
- Permanent share links become a requirement — at which point the lifecycle rule must be removed or scoped via tags, and the presigned URL pattern replaced with public-read + CloudFront in front.
