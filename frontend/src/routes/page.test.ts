import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$env/static/public", () => ({
  PUBLIC_API_URL: "https://api.example",
  PUBLIC_GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
}));

import Page from "./+page.svelte";

type GoogleCredentialCallback = (response: { credential: string }) => void;

function credentialFor(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${b64}.signature`;
}

async function loadGoogleScript() {
  const script = await waitFor(() => {
    const el = document.head.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    expect(el).not.toBeNull();
    return el;
  });

  script!.dispatchEvent(new Event("load"));
}

describe("+page", () => {
  let googleSignInCallback: GoogleCredentialCallback;
  let fetchMock: ReturnType<typeof vi.fn>;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    googleSignInCallback = () => {};
    vi.stubGlobal("google", {
      accounts: {
        id: {
          initialize: vi.fn((config: { callback: GoogleCredentialCallback }) => {
            googleSignInCallback = config.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    });

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lets a signed-in user upload HTML and copy the share URL", async () => {
    const credential = credentialFor({ email: "sean@codurance.com" });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
        key: "user-1/object.html",
        expiresInDays: 7,
      }),
    });

    render(Page);

    await loadGoogleScript();

    googleSignInCallback({ credential });

    await screen.findByText("Share an HTML file or zip bundle");

    const file = new File(["<html><body>Hello</body></html>"], "hello world.html", {
      type: "text/html",
    });
    const input = document.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();
    await fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/upload?filename=hello%20world.html",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "text/html",
          Authorization: `Bearer ${credential}`,
        },
        body: file,
      })
    );

    const link = await screen.findByRole("link", {
      name: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );

    await fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    expect(writeTextMock).toHaveBeenCalledWith(
      "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });

  it("shows an upload error when the API rejects the file", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 415,
      text: async () => "Body does not look like HTML",
    });

    render(Page);

    await loadGoogleScript();

    googleSignInCallback({
      credential: credentialFor({ email: "sean@codurance.com" }),
    });

    await screen.findByText("Share an HTML file or zip bundle");

    const file = new File(["nope"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();
    await fireEvent.change(input!, { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Upload failed (415): Body does not look like HTML"
    );
  });

  it("sends zip uploads with the zip content type", async () => {
    const credential = credentialFor({ email: "sean@codurance.com" });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
        key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/",
        expiresInDays: 7,
      }),
    });

    render(Page);

    await loadGoogleScript();
    googleSignInCallback({ credential });
    await screen.findByText("Share an HTML file or zip bundle");

    const file = new File(["zip-bytes"], "bundle.zip", {
      type: "application/zip",
    });
    const input = document.querySelector<HTMLInputElement>("input[type='file']");
    expect(input).not.toBeNull();
    await fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/upload?filename=bundle.zip",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/zip",
          Authorization: `Bearer ${credential}`,
        },
        body: file,
      })
    );
  });
});
