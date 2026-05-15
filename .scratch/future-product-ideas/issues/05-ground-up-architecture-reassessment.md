# 05 — Proposal: ground-up architecture reassessment

Status: needs-triage

Suggested model: **Human** — architecture review and ADR work before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

## What to build

Reassess the product architecture from first principles before too much behaviour accretes around accidental tool and service choices. The goal is not to rewrite for its own sake, but to test whether the current SvelteKit static frontend, API Gateway/Lambda upload path, S3 object serving, CloudFront routing, auth model, and future metadata needs still make sense for the intended product.

## Acceptance criteria

- [ ] Describe the product capabilities the architecture must support over the next phase, including privacy, tracking, versioning, and AI-generated documents.
- [ ] Map current architecture decisions to the constraints they satisfy and the trade-offs they impose.
- [ ] Compare at least two credible target architectures, including a "keep and evolve current architecture" option.
- [ ] Document decision criteria such as security, operability, cost, development speed, data model fit, and future AI workflow support.
- [ ] Record the chosen direction in ADR form or explicitly decide to defer.
- [ ] Split any migration or hardening work into small implementation tickets.

## Blocked by

None — proposal only. Should be considered before major new feature streams introduce more persistent data or long-running workflows.

## Comments

- 2026-05-15 — Captured from a future-work idea: perform a ground-up rearchitecture check to avoid hacking the product together from mismatched tools and services.

