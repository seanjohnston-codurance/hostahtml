# ADR-0001: Static SvelteKit frontend + dedicated Lambda over SvelteKit server routes

Date: 2026-05-12
Status: Accepted

## Context

The frontend is a Svelte 5 app hosted on S3 + CloudFront. The SvelteKit migration can either stay fully static or move rendering/server routes into a SvelteKit runtime. Backend work (Google JWT verification, S3 upload, presigned URL generation) currently lives in a dedicated AWS Lambda exposed via API Gateway HTTP API.

SvelteKit 2 supports server routes (`+server.ts`) that could in principle fold the Lambda's responsibilities into the same project, deployed via `@sveltejs/adapter-node` or a community AWS Lambda adapter. Question raised during planning: is the current split silly? Are we maintaining two TypeScript codebases when one would do?

Constraints that matter for this decision:
- The audience is small (Codurance staff). Traffic is low.
- Storage cost dominates compute cost — files live 7 days, no other state.
- The Lambda is a security boundary: it holds IAM credentials to write to the bucket and the `GOOGLE_CLIENT_ID` to validate JWT audience claims.

## Decision

**Keep the split.** Frontend becomes a static SvelteKit app via `@sveltejs/adapter-static`: prerender `/` at build time and emit `200.html` as the fallback for future client-routed deep links. Backend stays a dedicated Lambda. Shared TypeScript types live in a `@hostahtml/shared` workspace.

## Consequences

**Positive:**
- Frontend deploys as static files to S3 + CloudFront. No cold-start surface on page loads. CloudFront edge-caches the UI, including the prerendered `/` route.
- Lambda is independent — could be called from a CLI or scheduled task without touching the frontend.
- Security boundary is unambiguous: only the Lambda has IAM credentials.
- The two codebases evolve at their own cadence; frontend deploys (S3 sync) are fast and risk-free, infra deploys (CDK) are slower and gated.

**Negative:**
- Two TypeScript projects to maintain. Types like `UploadResponse` would drift — mitigated by the `@hostahtml/shared` workspace.
- Two deploy steps in CI (S3 sync + CDK deploy).
- A SvelteKit-monolith would marginally reduce LOC (~80 lines of Lambda code becomes `+server.ts` routes). We're choosing not to capture that saving.

## Reconsider if

- The api code grows substantially (10× or more) or starts sharing non-trivial logic with the frontend that's awkward to extract.
- CloudFront-level caching becomes unnecessary (e.g. all pages become user-specific and uncacheable), removing one of the main reasons to keep the frontend static.
- Hosting economics shift (e.g. SvelteKit-on-Lambda via a mature adapter becomes obviously cheaper to run than the split).

## See also

- ADR-0002 (rate limits)
- ADR-0004 (workspace layout)
- ADR-0005 (app-level share tokens; phased migration from client-visible presigned URLs)
