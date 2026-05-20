import { render, screen } from "@testing-library/svelte";
import { expect, it } from "vitest";
import TemporaryDeploymentBanner from "./TemporaryDeploymentBanner.svelte";

it("warns that the deployment is temporary and not for external documents", () => {
  render(TemporaryDeploymentBanner);

  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent(/temporary/i);
  expect(banner).toHaveTextContent(/AWS Playground/i);
  expect(banner).toHaveTextContent(/not yet ready for external documents/i);
});

it("does not offer a dismiss control", () => {
  render(TemporaryDeploymentBanner);

  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
