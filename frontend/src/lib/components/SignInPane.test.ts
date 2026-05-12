import { render } from "@testing-library/svelte";
import { expect, it } from "vitest";
import SignInPane from "./SignInPane.svelte";

it("renders Google button mount point with given id", () => {
  const { container } = render(SignInPane, { props: { googleButtonId: "gsi-test" } });
  expect(container.querySelector("#gsi-test")).toBeTruthy();
});
