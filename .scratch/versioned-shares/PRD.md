# Versioned files and links (proposal)

**Status:** exploratory — no product commitment.

This feature does not exist yet. The working proposal and open questions live in:

- [issues/01-versioning-proposal.md](./issues/01-versioning-proposal.md)

Related today: uploads use immutable S3 keys (`{userId}/{uuid}-…`); **ADR-0005** / **ADR-0006** introduce opaque share tokens that map to a single object for seven days. Versioning would change what a “share” means over time (multiple blobs, stable human-facing identity, or both).
