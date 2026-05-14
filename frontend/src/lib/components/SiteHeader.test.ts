import { render, screen } from "@testing-library/svelte";
import { expect, it } from "vitest";
import SiteHeader from "./SiteHeader.svelte";

it("shows user email when set", () => {
  render(SiteHeader, { props: { userEmail: "dev@example.com" } });
  expect(screen.getByText("dev@example.com")).toBeInTheDocument();
});

it("hides user chip when email is null", () => {
  render(SiteHeader, { props: { userEmail: null } });
  expect(screen.queryByText("dev@example.com")).not.toBeInTheDocument();
});

it("links to the changelog", () => {
  render(SiteHeader, { props: { userEmail: null } });
  expect(screen.getByRole("link", { name: "What's new?" })).toHaveAttribute(
    "href",
    "/changelog"
  );
});

it("marks the current page in the navigation", () => {
  render(SiteHeader, { props: { userEmail: null, currentPath: "/changelog" } });

  expect(screen.getByRole("link", { name: "What's new?" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  expect(screen.getByRole("link", { name: "Uploader" })).not.toHaveAttribute(
    "aria-current"
  );
});
