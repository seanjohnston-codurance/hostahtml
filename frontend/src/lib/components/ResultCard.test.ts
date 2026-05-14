import { render, screen, fireEvent } from "@testing-library/svelte";
import { expect, it, vi } from "vitest";
import ResultCard from "./ResultCard.svelte";

it("invokes onCopy when copy button is pressed", async () => {
  const onCopy = vi.fn();
  render(ResultCard, {
    props: {
      result: {
        url: "https://example.com/o",
        key: "k1",
        createdAt: 1778662800,
        expiresAt: 1779267600,
        expiresInDays: 7,
      },
      copied: false,
      onCopy,
    },
  });
  await fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
  expect(onCopy).toHaveBeenCalled();
});

it("labels draft links as not for circulation", () => {
  render(ResultCard, {
    props: {
      result: {
        url: "https://example.com/o",
        key: "k1",
        createdAt: 1778662800,
        expiresAt: 1779267600,
        expiresInDays: 7,
        draft: true,
      },
      copied: false,
      onCopy: vi.fn(),
    },
  });

  expect(screen.getByText(/draft \/ not for circulation/i)).toBeInTheDocument();
});
