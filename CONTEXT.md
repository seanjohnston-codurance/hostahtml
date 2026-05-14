# HostaHTML

HostaHTML is an internal tool for turning uploaded HTML pages and bundles into temporary share links for Codurance users.

## Language

**Share**:
A user-created, token-addressed bundle that can be opened until its expiry unless it has been deleted.
_Avoid_: Upload, file, object, document

**Draft share**:
A share whose HTML responses show a draft watermark while it remains accessible.
_Avoid_: Draft upload, staging file

**Deleted share**:
A share that remains visible to its owner until expiry but whose public link no longer opens.
_Avoid_: Revoked share, removed upload

**Bundle**:
The uploaded page files served together under one share.
_Avoid_: Directory, S3 prefix

## Relationships

- A **Share** points to exactly one **Bundle**.
- A **Bundle** contains one or more uploaded files and has a root `index.html`.
- A **Draft share** is still a **Share**.
- A **Deleted share** is not publicly accessible but may remain visible in the owner's dashboard until expiry.

## Example Dialogue

> **Dev:** "If a user deletes a **Share**, should the dashboard remove it immediately?"
> **Domain expert:** "No. Keep the **Deleted share** visible until expiry, but its URL should not be clickable because the public link no longer opens."

## Flagged Ambiguities

- "Upload" is often used casually for both the file transfer and the resulting **Share**. In product language, use **Share** for the dashboard item.
- "Revoked" is the internal token mechanism; user-facing language is **Deleted share**.
