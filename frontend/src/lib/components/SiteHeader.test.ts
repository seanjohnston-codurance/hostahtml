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
