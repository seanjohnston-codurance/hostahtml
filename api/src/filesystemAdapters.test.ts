import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFilesystemObjectStore } from "./objectStore.js";
import { createFilesystemShareTokenStore } from "./shareTokenStore.js";

describe("filesystem local adapters", () => {
  it("persists object bodies and content types by key", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hostahtml-objects-"));
    try {
      const store = createFilesystemObjectStore(root);

      await store.putObject({
        key: "local-user/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
        body: Buffer.from("<html><body>local</body></html>", "utf8"),
        contentType: "text/html; charset=utf-8",
      });

      await expect(
        store.getObject("local-user/01HZX3NDEKTSV4RRFFQ69G5BND/index.html")
      ).resolves.toEqual({
        body: Buffer.from("<html><body>local</body></html>", "utf8"),
        contentType: "text/html; charset=utf-8",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsafe object keys", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hostahtml-objects-"));
    try {
      const store = createFilesystemObjectStore(root);

      await expect(
        store.putObject({
          key: "../outside.html",
          body: Buffer.from("<html></html>", "utf8"),
          contentType: "text/html; charset=utf-8",
        })
      ).rejects.toThrow(/Unsafe object key/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("persists share records as token-addressed documents", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hostahtml-tokens-"));
    try {
      const store = createFilesystemShareTokenStore(root);
      const record = {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "local-user",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        createdAt: 1778662800,
        expiresAt: 1779267600,
        draft: true,
      };

      await store.putShareRecord(record);

      await expect(store.getShareRecord(record.token)).resolves.toEqual(record);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists unexpired share records owned by a local user", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hostahtml-tokens-"));
    try {
      const store = createFilesystemShareTokenStore(root);
      await store.putShareRecord({
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "local-user",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        filename: "page.html",
        paths: ["index.html"],
        createdAt: 1778662800,
        expiresAt: 1779267600,
      });
      await store.putShareRecord({
        token: "01BRZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "someone-else",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BOO",
        filename: "other.html",
        paths: ["index.html"],
        createdAt: 1778662800,
        expiresAt: 1779267600,
      });
      await store.putShareRecord({
        token: "01CRZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "local-user",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5OLD",
        filename: "expired.html",
        paths: ["index.html"],
        createdAt: 1778000000,
        expiresAt: 1778662799,
      });

      await expect(
        store.listShareRecordsByOwner("local-user", 1778662800)
      ).resolves.toEqual([
        expect.objectContaining({
          token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("updates local share records with ownership and expiry checks", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "hostahtml-tokens-"));
    try {
      const store = createFilesystemShareTokenStore(root);
      await store.putShareRecord({
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "local-user",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        filename: "page.html",
        paths: ["index.html"],
        createdAt: 1778662800,
        expiresAt: 1779267600,
        draft: true,
      });

      await expect(
        store.updateShareRecordDraft(
          "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          "local-user",
          false,
          1778662800
        )
      ).resolves.toEqual(expect.objectContaining({ draft: false }));
      await expect(
        store.markShareRecordDeleted(
          "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          "someone-else",
          1778662800
        )
      ).resolves.toBeNull();
      await expect(
        store.markShareRecordDeleted(
          "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          "local-user",
          1778662800
        )
      ).resolves.toEqual(expect.objectContaining({ revoked: true }));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
