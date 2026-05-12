# 04 — Infra: S3 lifecycle + API Gateway throttle + fallback routing

Status: done

Depends on: nothing (independent of issues 01–03).

## Motivation

Three infra-only fixes:

- **S3 objects persist past their 7-day presigned URL expiry.** Storage grows unbounded. Adding a lifecycle rule on the bucket purges objects after 7 days, matching the URL TTL (see ADR-0003).
- **No rate limiting.** A misbehaving script could hammer the upload endpoint. API Gateway HTTP API v2 stage route throttling is the cheap insurance: 5 req/s sustained, 10 burst. Per-user limits deferred (see ADR-0002).
- **CloudFront fallback routing needs to match SvelteKit.** The frontend build now emits a prerendered `/` as `index.html` plus an adapter-static fallback at `200.html`; CloudFront 403/404 rewrites must point to `/200.html` so future client-routed deep links work.

## Scope

Edit `infra/lib/hostahtml-stack.ts`:

### Bucket lifecycle

```ts
const bucket = new s3.Bucket(this, 'UploadsBucket', {
  // ...existing config...
  lifecycleRules: [
    { id: 'expire-after-7-days', expiration: cdk.Duration.days(7) },
  ],
});
```

### API Gateway HTTP API v2 stage throttle

```ts
const stage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage;
stage.defaultRouteSettings = {
  throttlingRateLimit: 5,
  throttlingBurstLimit: 10,
};
```

This stack uses `aws-cdk-lib/aws-apigatewayv2.HttpApi`, so use API Gateway v2 stage route settings. Do not copy REST API examples like `defaultMethodOptions`, and do not use a non-existent `HttpApi` `defaultRouteOptions.throttle`.

### CloudFront static fallback routing

```ts
errorResponses: [
  { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/200.html' },
  { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/200.html' },
]
```

`index.html` remains the prerendered `/` route. `200.html` is the SvelteKit adapter-static fallback for future client-routed deep links. Keep `svelte.config.js` `fallback` and CloudFront `responsePagePath` in sync.

## Out of scope

- Per-user rate limits (ADR-0002 — wait for DynamoDB).
- Multi-tier TTLs (ADR-0003 — single 7-day policy).
- Application code changes.

## Acceptance

- [ ] `cd infra && npx cdk diff` shows the new lifecycle rule, HTTP API v2 throttle settings, and CloudFront fallback page change to `/200.html`, nothing else.
- [ ] `cd infra && npx cdk deploy` succeeds.
- [ ] `aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET"` shows the 7-day expiration rule.
- [ ] Post-deploy, upload a test file; verify the object is gone within ~48 h of day 8 (lifecycle is eventually consistent).

## Comments
