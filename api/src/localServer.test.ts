import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalApiServer } from "./localServer.js";
import { setObjectStoreForTest } from "./objectStore.js";
import { setShareTokenStoreForTest } from "./shareTokenStore.js";

describe("local API server", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "hostahtml-local-api-"));
    process.env.HOSTAHTML_STORAGE = "filesystem";
    process.env.HOSTAHTML_AUTH = "local";
    process.env.LOCAL_AUTH_USER_ID = "local-user";
    process.env.HOSTAHTML_LOCAL_DATA_DIR = dataDir;
    setObjectStoreForTest(undefined);
    setShareTokenStoreForTest(undefined);
  });

  afterEach(async () => {
    setObjectStoreForTest(undefined);
    setShareTokenStoreForTest(undefined);
    delete process.env.HOSTAHTML_STORAGE;
    delete process.env.HOSTAHTML_AUTH;
    delete process.env.LOCAL_AUTH_USER_ID;
    delete process.env.HOSTAHTML_LOCAL_DATA_DIR;
    delete process.env.SHARE_BASE_URL;
    await rm(dataDir, { recursive: true, force: true });
  });

  it("uploads HTML and serves it back from the token namespace", async () => {
    const server = createLocalApiServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    process.env.SHARE_BASE_URL = baseUrl;

    try {
      const upload = await fetch(`${baseUrl}/upload?filename=hello.html`, {
        method: "POST",
        headers: {
          Authorization: "Bearer dev-token",
          "Content-Type": "text/html",
        },
        body: "<html><body>local</body></html>",
      });

      expect(upload.status).toBe(200);
      expect(upload.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:5173"
      );
      const payload = (await upload.json()) as { url: string };
      expect(payload.url).toMatch(new RegExp(`^${baseUrl}/t/[0-9A-HJKMNP-TV-Z]{26}$`));

      const share = await fetch(payload.url);

      expect(share.status).toBe(200);
      expect(share.url).toBe(`${payload.url}/`);
      expect(share.headers.get("content-type")).toBe("text/html; charset=utf-8");
      await expect(share.text()).resolves.toBe("<html><body>local</body></html>");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
