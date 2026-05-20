import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testEnv = vi.hoisted(() => ({
  dev: true,
  publicAuthMode: "local",
}));

vi.mock("$env/static/public", () => ({
  PUBLIC_API_URL: "https://api.example",
  get PUBLIC_AUTH_MODE() {
    return testEnv.publicAuthMode;
  },
  PUBLIC_GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
}));

vi.mock("$app/environment", () => ({
  get dev() {
    return testEnv.dev;
  },
}));

import DashboardPage from "./+page.svelte";
import { resetAuthForTest } from "$lib/auth.svelte.js";

describe("/dashboard", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testEnv.dev = true;
    testEnv.publicAuthMode = "local";
    sessionStorage.clear();
    resetAuthForTest();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sharesResponse(shares: unknown[]) {
    return {
      ok: true,
      json: async () => ({ shares }),
    };
  }

  it("warns that the deployment is temporary and not ready for external documents", () => {
    render(DashboardPage);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/temporary deployment/i);
    expect(banner).toHaveTextContent(/AWS Playground/i);
    expect(banner).toHaveTextContent(/not yet ready for external documents/i);
  });

  it("loads active shares and renders newest uploads first", async () => {
    fetchMock.mockResolvedValueOnce(
      sharesResponse([
        {
          token: "old-token",
          url: "https://share.example/t/old-token",
          filename: "old.html",
          title: "Old page",
          createdAt: 100,
          expiresAt: 900,
          draft: false,
          deleted: false,
        },
        {
          token: "new-token",
          url: "https://share.example/t/new-token",
          filename: "new.html",
          title: "New page",
          createdAt: 200,
          expiresAt: 1000,
          draft: true,
          deleted: false,
        },
      ])
    );

    const { container } = render(DashboardPage);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("https://api.example/shares", {
        headers: { Authorization: "Bearer dev-token" },
      })
    );

    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText("New page")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Old page")).toBeInTheDocument();
    expect(container.querySelectorAll(".thumbnail-slot")).toHaveLength(2);
  });

  it("renders deleted share URLs as non-clickable text without draft state", async () => {
    fetchMock.mockResolvedValueOnce(
      sharesResponse([
        {
          token: "deleted-token",
          url: "https://share.example/t/deleted-token",
          filename: "deleted.html",
          title: "Deleted page",
          createdAt: 200,
          expiresAt: 1000,
          draft: true,
          deleted: true,
        },
      ])
    );

    render(DashboardPage);

    const deletedCard = await screen.findByRole("article");
    expect(
      within(deletedCard).queryByRole("link", {
        name: "https://share.example/t/deleted-token",
      })
    ).not.toBeInTheDocument();
    expect(
      within(deletedCard).getByText("https://share.example/t/deleted-token")
    ).toBeInTheDocument();
    expect(within(deletedCard).getByText("Deleted")).toBeInTheDocument();
    expect(within(deletedCard).queryByText("Draft")).not.toBeInTheDocument();
    expect(within(deletedCard).queryByRole("button")).not.toBeInTheDocument();
  });

  it("toggles draft state in place", async () => {
    fetchMock
      .mockResolvedValueOnce(
        sharesResponse([
          {
            token: "share-token",
            url: "https://share.example/t/share-token",
            filename: "page.html",
            title: "Page",
            createdAt: 200,
            expiresAt: 1000,
            draft: false,
            deleted: false,
          },
        ])
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          share: {
            token: "share-token",
            url: "https://share.example/t/share-token",
            filename: "page.html",
            title: "Page",
            createdAt: 200,
            expiresAt: 1000,
            draft: true,
            deleted: false,
          },
        }),
      });

    render(DashboardPage);

    await fireEvent.click(await screen.findByRole("button", { name: "Mark as draft" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.example/shares/share-token",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ draft: true }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer dev-token",
        },
      })
    );
    expect(await screen.findByText("Draft")).toBeInTheDocument();
  });

  it("marks a share deleted in place", async () => {
    fetchMock
      .mockResolvedValueOnce(
        sharesResponse([
          {
            token: "share-token",
            url: "https://share.example/t/share-token",
            filename: "page.html",
            title: "Page",
            createdAt: 200,
            expiresAt: 1000,
            draft: false,
            deleted: false,
          },
        ])
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          share: {
            token: "share-token",
            url: "https://share.example/t/share-token",
            filename: "page.html",
            title: "Page",
            createdAt: 200,
            expiresAt: 1000,
            draft: false,
            deleted: true,
          },
        }),
      });

    render(DashboardPage);

    await fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Confirm delete" })
    ).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.example/shares/share-token",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer dev-token" },
      })
    );
    expect(await screen.findByText("Deleted")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "https://share.example/t/share-token" })
    ).not.toBeInTheDocument();
  });
});
