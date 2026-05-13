import { render, fireEvent } from "@testing-library/svelte";
import { expect, it, vi } from "vitest";
import Dropzone from "./Dropzone.svelte";

it("passes the chosen file to the parent for staging", async () => {
  const onFile = vi.fn();
  const { container } = render(Dropzone, { props: { uploading: false, onFile } });
  const input = container.querySelector("input[type='file']") as HTMLInputElement;
  const file = new File(["<html></html>"], "page.html", { type: "text/html" });
  await fireEvent.change(input, { target: { files: [file] } });
  expect(onFile).toHaveBeenCalledWith(file);
});

it("passes a dropped file to the parent for staging", async () => {
  const onFile = vi.fn();
  const { getByRole } = render(Dropzone, { props: { uploading: false, onFile } });
  const file = new File(["<html></html>"], "page.html", { type: "text/html" });

  await fireEvent.drop(getByRole("button"), {
    dataTransfer: { files: [file] },
  });

  expect(onFile).toHaveBeenCalledWith(file);
});

it("accepts HTML and zip bundle files", () => {
  const { container, getByText } = render(Dropzone, {
    props: { uploading: false, onFile: vi.fn() },
  });
  const input = container.querySelector("input[type='file']") as HTMLInputElement;

  expect(input.accept).toBe(".html,text/html,.zip,application/zip");
  expect(getByText(/HTML file or zip bundle/i)).toBeInTheDocument();
});
