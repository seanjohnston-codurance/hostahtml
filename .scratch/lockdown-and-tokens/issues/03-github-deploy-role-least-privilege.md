# 03 — GitHub OIDC deploy role least privilege

Status: done

Suggested model: **Sonnet 4.5 or GPT-5.2** (IAM policy iteration from `cdk deploy` / CloudFormation denials; avoid fastest model unless you enjoy policy whack-a-mole)

Type: AFK (verify with real `cdk deploy` in a sandbox account before trusting production)

## Parent

[PRD](../PRD.md) — Lockdown and tokens

## What to build

Replace `AdministratorAccess` on the GitHub OIDC deploy role with an inline (or tightly scoped) policy sufficient for what `.github/workflows/deploy.yml` does: CDK deploy this stack, publish assets, sync frontend bucket, invalidate CloudFront. No blanket admin attachment remains.

## Acceptance criteria

- [ ] `GithubDeployRole` has no `AdministratorAccess` managed policy.
- [ ] Role can still complete `cdk deploy` and the workflow’s S3 sync + invalidation (verified in CI or sandbox with the role).
- [ ] Policy documented in issue comments or ADR pointer if non-obvious.

## Blocked by

None — can start immediately (may merge after 01/02 to reduce CDK churn).

## User stories covered

- As security, a compromised `main` workflow cannot assume full account admin.

## Comments

Policy lives as `GithubDeployRole` default inline policy in `infra/lib/hostahtml-stack.ts` (CloudFormation stack `HostahtmlStack`, S3 app buckets + `cdk-hnb659fds-assets-*`, IAM roles `HostahtmlStack*`, Lambda, API Gateway, CloudFront distributions in account, OIDC provider ARN, SSM bootstrap version). **Sandbox `cdk deploy` from this role is recommended** before production: if CloudFormation or CDK adds new resource types, extend that policy.