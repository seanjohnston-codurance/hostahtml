import { render, screen } from "@testing-library/svelte";
import { expect, it } from "vitest";
import SiteFooter from "./SiteFooter.svelte";

it("renders footer copy", () => {
  render(SiteFooter);
  expect(screen.getByText(/Codurance Ltd/)).toBeInTheDocument();
});
