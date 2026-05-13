import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog";

describe("parseChangelog", () => {
  it("parses dated entries, sections, and bullets from the changelog", () => {
    const changelog = `# Changelog

User-facing updates for HostaHTML.

## 2026-05-13

### Added

- Added shorter, cleaner share links.
- Added support for zip bundles.

### Fixed

- Invalid links now fail clearly.

## 2026-05-12

### Changed

- Shared pages now consistently live for 7 days.
`;

    expect(parseChangelog(changelog)).toEqual({
      title: "Changelog",
      intro: "User-facing updates for HostaHTML.",
      entries: [
        {
          date: "2026-05-13",
          displayDate: "13 May 2026",
          sections: [
            {
              heading: "Added",
              items: [
                "Added shorter, cleaner share links.",
                "Added support for zip bundles.",
              ],
            },
            {
              heading: "Fixed",
              items: ["Invalid links now fail clearly."],
            },
          ],
        },
        {
          date: "2026-05-12",
          displayDate: "12 May 2026",
          sections: [
            {
              heading: "Changed",
              items: ["Shared pages now consistently live for 7 days."],
            },
          ],
        },
      ],
    });
  });

  it("rejects entries with invalid calendar dates", () => {
    expect(() => parseChangelog("## 2026-02-30\n\n### Added\n\n- Impossible date")).toThrow(
      "Invalid changelog date: 2026-02-30"
    );
  });

  it("returns an empty changelog for empty markdown", () => {
    expect(parseChangelog("")).toEqual({
      title: "Changelog",
      intro: "",
      entries: [],
    });
  });
});
