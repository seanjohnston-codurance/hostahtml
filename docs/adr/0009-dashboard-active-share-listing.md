# ADR-0009: Dashboard lists active shares from the expiry index

Date: 2026-05-14
Status: Accepted

## Context

The user dashboard needs to show a signed-in user what they have uploaded, including live, draft, and deleted shares until those shares expire.

The existing share token table is keyed by public `token`, which is correct for resolving `/t/{token}` but cannot answer "show me my current shares" without scanning. New dashboard requirements introduce an owner-based access pattern:

- list shares owned by the authenticated Google subject;
- exclude expired shares;
- include deleted shares until expiry so the user can see what happened;
- display newer uploads first in the UI;
- preserve future dynamic share lifetimes rather than assuming a fixed seven-day window.

There are two different orderings in play. `expiresAt` is the right server-side access pattern for "currently active"; `createdAt DESC` is the right presentation order for "newest uploads first".

## Decision

Add an owner-based DynamoDB GSI to the share token table:

- partition key: `ownerUserId`;
- sort key: `expiresAt`.

The dashboard list endpoint queries this index for `ownerUserId = current user` and `expiresAt > now`. It returns the current active share set, including deleted shares whose token rows have not expired yet.

The frontend sorts the returned active shares by `createdAt` descending before rendering them. Deleted shares remain visible until `expiresAt`, but their URLs are displayed as non-clickable text.

Do not add server-side pagination or a second `ownerUserId`/`createdAt` index in the first dashboard implementation. Treat that as a future scaling change if real usage proves the active-share set can become large enough to justify it.

## Consequences

**Positive:**

- The server-side query matches the product boundary: "active shares for this user".
- Dynamic lifetimes are supported because expiry is data, not hard-coded UI policy.
- The UI can show newest uploads first without adding another DynamoDB index now.
- The implementation avoids scans and avoids treating S3 object prefixes as the source of truth.

**Negative:**

- Client-side sorting is only acceptable while a user's active-share set is small.
- Pagination by `createdAt DESC` is not real pagination with this index shape.
- If active-share lifetimes become long or users upload heavily, the list endpoint may need a limit, pagination, or a second access pattern.

## Reconsider if

- Users can have enough unexpired shares that returning the whole active set is slow or expensive.
- Product requirements add infinite scroll, search, filtering, or stable server-side pagination.
- Share lifetimes become long enough that "active shares" behaves more like durable history.
- Dashboard ordering becomes a backend contract rather than a frontend presentation detail.

## See also

- ADR-0003 — 7-day TTL alignment, which may change later but still depends on `expiresAt`.
- ADR-0005 — app-level share tokens.
- ADR-0007 — bundle upload storage and V1 serving.
