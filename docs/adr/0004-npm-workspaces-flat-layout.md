# ADR-0004: Flat npm workspaces layout (no `packages/` directory)

Date: 2026-05-12
Status: Accepted

## Context

After moving the Lambda out of `infra/` (see issue 02), the repo has four workspaces: `frontend/`, `api/`, `shared/`, `infra/`. The standard monorepo question: do they live at the repo root (flat) or under a `packages/` (or `apps/` + `packages/`) parent directory?

Common patterns:

- **Flat**: `frontend/`, `api/`, `shared/`, `infra/` at the root.
- **`packages/`**: everything under a single parent.
- **`apps/` + `packages/`**: deployables under `apps/`, libraries under `packages/`. Conventional in Turborepo / Nx setups.

## Decision

**Flat layout.** All four workspaces live at the repo root.

```
hostahtml/
├── frontend/
├── api/
├── shared/
├── infra/
├── docs/
└── .scratch/
```

The npm root `package.json` declares `"workspaces": ["frontend", "api", "shared", "infra"]`.

## Consequences

**Positive:**
- Shorter import paths and fewer directory levels in tooling config.
- Matches the existing layout: `frontend/` and `infra/` were already at the root before this work.
- CDK references `../api/src/handler.ts` rather than `../packages/api/src/handler.ts`.
- Easier for newcomers to find code — the top-level `ls` is the project map.

**Negative:**
- The root directory listing grows denser as workspaces are added.
- Less clear separation between "deployables" and "libraries" (the `apps/`+`packages/` convention encodes this).

## Reconsider when

- Workspace count reaches ~5 or more (current count: 4).
- The root listing becomes genuinely noisy — i.e. when finding `frontend/` among siblings takes more than a glance.
- We add multiple type-only packages and want them visually grouped under `packages/`.
