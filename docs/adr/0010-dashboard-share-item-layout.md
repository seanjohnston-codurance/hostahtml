# ADR-0010: Dashboard share items use the M2 thumbnail-row layout

Date: 2026-05-14
Status: Accepted

## Context

The dashboard needs each share item to be easy to recognise at a glance while still supporting dense scanning across several active shares. We prototyped thumbnail-led cards and dense rows in `.scratch/dashboard-item-layouts.html`.

Two alternatives stood out:

- **M2 thumbnail row**: a short thumbnail strip on the left, share identity and URL in the main body, expiry and actions inline below.
- **D0 dense command row**: a compact pill-shaped row with optional thumbnail support.

## Decision

Use **M2** as the dashboard share item layout.

Each item keeps a thumbnail container on the left. If no thumbnail is available, the container remains as a blank placeholder so the visual flow and row rhythm stay consistent. The state pill appears inline after the page title and says only `Live` or `Draft`. Expiry is shown as plain labelled text rather than as a pill.

Keep **D0 with optional thumbnails** as the rejected alternative for later reconsideration if the dashboard needs a much denser list view.

## Consequences

**Positive:**

- The thumbnail slot gives users a stronger recognition cue than filename or title alone.
- Keeping a blank thumbnail container avoids layout shift between shares with and without previews.
- The chosen layout remains denser than a large preview card while leaving enough room for URL, expiry, and actions.

**Negative:**

- Until real thumbnails are generated or uploaded, the left container is mostly visual scaffolding.
- The layout consumes more horizontal space than the D0 dense row.

## Reconsider if

- Users commonly have enough active shares that thumbnail rows feel too tall.
- Thumbnail generation is deferred indefinitely and the blank container feels wasteful.
- A compact/list-density mode becomes more important than recognition.
