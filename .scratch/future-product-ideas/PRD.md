# Future product ideas

## Why

Capture promising but under-specified product and architecture ideas before they are ready for implementation. These notes are intentionally lightweight: each ticket should preserve the intent, identify the main decisions still needed, and stay in `needs-triage` until someone turns it into a PRD, ADR, or vertical-slice implementation plan.

## Candidate areas

1. Track recipient opens and actions on shared links.
2. Improve link privacy and security with per-recipient tokens or similar controls.
3. Add open-count limits alongside time-based expiry.
4. Generate finished HTML documents from uploaded source material via the Claude API and an agent skill.
5. Reassess the architecture from first principles before the product grows around accidental service choices.
6. Support document versioning with dedicated old-version URLs while normal share tokens resolve to the latest version.

## Out of scope

- Treating any ticket here as ready for an AFK implementation agent.
- Settling analytics, privacy, storage, or architecture trade-offs without explicit product/security review.
- Replacing existing issue streams such as lockdown, tokens, and versioned shares; related tickets should link back to those streams when promoted.

