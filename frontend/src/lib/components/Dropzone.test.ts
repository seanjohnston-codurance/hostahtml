import { render, fireEvent } from "@testing-library/svelte";
import { expect, it, vi } from "vitest";
import Dropzone from "./Dropzone.svelte";

it("calls onFile when a file is chosen", async () => {
  const onFile = vi.fn();
  const { container } = render(Dropzone, { props: { uploading: false, onFile } });
  const input = container.querySelector("input[type='file']") as HTMLInputElement;
  const file = new File(["<html></html>"], "page.html", { type: "text/html" });
  await fireEvent.change(input, { target: { files: [file] } });
  expect(onFile).toHaveBeenCalledWith(file);
});
