# 04 — Proposal: generate documents from source uploads with Claude

Status: needs-triage

Suggested model: **Human** — product, security, cost, and data-handling review before implementation.

Type: **Proposal** (no implementation in this issue)

## Parent

[PRD](../PRD.md) — Future product ideas

## What to build

Explore letting a user upload source material and have the system call the Claude API to run a document-generation agent skill, producing a polished HTML document instead of requiring the user to upload finished HTML. The proposal should define the intended source formats, output expectations, review flow, and data-handling boundaries.

## Acceptance criteria

- [ ] Define supported source inputs, such as markdown, PDFs, text notes, decks, or mixed file bundles.
- [ ] Decide whether generation is synchronous, queued, or explicitly reviewed before publishing.
- [ ] Document how the agent skill is selected, versioned, configured, and audited.
- [ ] Identify privacy, confidentiality, retention, and third-party API data-use constraints.
- [ ] Estimate cost, latency, failure modes, and retry behaviour.
- [ ] Split into implementation tickets only after the workflow and data-handling policy are chosen.

## Blocked by

None — proposal only. Implementation likely needs an architecture decision before introducing long-running generation work.

## Comments

- 2026-05-15 — Captured from a future-work idea: build in the Claude API to run an agent skill that generates documents from uploaded source material.

