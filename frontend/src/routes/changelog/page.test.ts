import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "./+page.svelte";

describe("/changelog", () => {
  it("renders a human-dated changelog entry", () => {
    render(Page, {
      props: {
        data: {
          changelog: {
            title: "Changelog",
            intro: "User-facing updates for HostaHTML.",
            entries: [
              {
                date: "2026-05-13",
                displayDate: "13 May 2026",
                sections: [
                  {
                    heading: "Added",
                    items: ["Added shorter, cleaner share links."],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    expect(screen.queryByRole("heading", { name: "Changelog" })).not.toBeInTheDocument();
    expect(screen.getByText("13 May 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Added" })).toBeInTheDocument();
    expect(screen.getByText("Added shorter, cleaner share links.")).toBeInTheDocument();
    expect(screen.queryByText("User-facing updates for HostaHTML.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /back to uploader/i })).not.toBeInTheDocument();
  });
});
