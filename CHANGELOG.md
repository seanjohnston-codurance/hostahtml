# Changelog

User-facing updates for HostaHTML.

## 2026-05-13

### Added

- Added a draft upload option so signed-in users can stage a file, choose whether it is a draft, and create watermarked draft links.
- Added a clearer active state to the top navigation so it is easier to tell which page you are on.
- Added shorter, cleaner share links that are easier to copy, paste, and send around.
- Added support for sharing zipped HTML pages with their supporting files, such as stylesheets, scripts, images, and fonts.
- Shared pages can now load their included assets from the same link, so more complete HTML demos work after upload.

### Changed

- Single HTML files and zipped page bundles now follow the same sharing flow.
- Choosing or dropping a file no longer uploads immediately; users now confirm the upload after reviewing the draft setting.
- Draft status now comes from the saved share metadata, not share-link query parameters.
- Share links no longer reveal storage details, making them cleaner and safer to share.

### Fixed

- Invalid, expired, or unavailable links now fail with a simple not-found response.
- Unsafe zipped pages are rejected during upload instead of producing broken or surprising shared pages later.
- Zipped pages wrapped in a single folder are now accepted when that folder contains the expected `index.html`.

## 2026-05-12

### Added

- Launched the upload experience for signing in with Google, uploading an HTML page, copying the share link, and seeing which account is signed in.
- Restricted uploads to verified Codurance Google accounts.
- Shared pages now consistently live for 7 days.

### Changed

- Upload failures now return clearer messages for common problems such as signing in, file size, or unsupported content.
- Uploads are checked more carefully before sharing, including a 5 MB limit and basic HTML detection.
- The site is better prepared for future in-app pages and deep links.

### Fixed

- The signed-in account display is more reliable.
- Failed uploads are less likely to leave partial files behind.
- Added basic protection against accidental or scripted upload bursts.
