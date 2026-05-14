import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  verifyGoogleTokenMock,
  sendMock,
  getSignedUrlMock,
  mintTokenMock,
  mintBundleIdMock,
  putShareRecordMock,
  deleteShareRecordMock,
} = vi.hoisted(() => ({
    verifyGoogleTokenMock: vi.fn(),
    sendMock: vi.fn(),
    getSignedUrlMock: vi.fn(),
    mintTokenMock: vi.fn(),
    mintBundleIdMock: vi.fn(),
    putShareRecordMock: vi.fn(),
    deleteShareRecordMock: vi.fn(),
  }));

vi.mock("./auth.js", () => ({
  verifyGoogleToken: verifyGoogleTokenMock,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = sendMock;
  },
  PutObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  DeleteObjectsCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

vi.mock("./shareTokens.js", () => ({
  mintToken: mintTokenMock,
  mintBundleId: mintBundleIdMock,
  putShareRecord: putShareRecordMock,
  deleteShareRecord: deleteShareRecordMock,
}));

import { handleUpload } from "./upload.js";
import { strToU8, zipSync } from "fflate";

describe("handleUpload", () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = "test-bucket";
    process.env.GOOGLE_CLIENT_ID = "cid";
    process.env.SHARE_BASE_URL = "https://share.example/";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00.000Z"));
    verifyGoogleTokenMock.mockReset();
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
    mintTokenMock.mockReset();
    mintBundleIdMock.mockReset();
    putShareRecordMock.mockReset();
    deleteShareRecordMock.mockReset();
    verifyGoogleTokenMock.mockResolvedValue("user-1");
    sendMock.mockResolvedValue({});
    getSignedUrlMock.mockResolvedValue("https://signed.example/object");
    mintTokenMock.mockReturnValue("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    mintBundleIdMock.mockReturnValue("01HZX3NDEKTSV4RRFFQ69G5BND");
    putShareRecordMock.mockResolvedValue(undefined);
    deleteShareRecordMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function baseEvent(
    overrides: Partial<import("aws-lambda").APIGatewayProxyEventV2> = {}
  ): import("aws-lambda").APIGatewayProxyEventV2 {
    return {
      version: "2.0",
      routeKey: "POST /upload",
      rawPath: "/upload",
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "acc",
        apiId: "api",
        domainName: "x.execute-api.region.amazonaws.com",
        domainPrefix: "x",
        http: {
          method: "POST",
          path: "/upload",
          protocol: "HTTP/1.1",
          sourceIp: "1.2.3.4",
          userAgent: "vitest",
        },
        requestId: "rid",
        routeKey: "POST /upload",
        stage: "$default",
        time: "01/Jan/2020:00:00:00 +0000",
        timeEpoch: 0,
      },
      isBase64Encoded: false,
      body: "<html><body>hi</body></html>",
      ...overrides,
    } as import("aws-lambda").APIGatewayProxyEventV2;
  }

  function zipBody(files: Record<string, string>): string {
    return Buffer.from(
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([path, content]) => [path, strToU8(content)])
        )
      )
    ).toString("base64");
  }

  it("returns 401 on missing token", async () => {
    const res = await handleUpload(baseEvent({ headers: {} }));
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Missing token" });
    expect(res.headers?.["content-type"]).toBe(
      "application/json; charset=utf-8"
    );
  });

  it("returns 401 on bad token", async () => {
    verifyGoogleTokenMock.mockRejectedValueOnce(new Error("bad"));
    const res = await handleUpload(
      baseEvent({ headers: { authorization: "Bearer bad" } })
    );
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Invalid token" });
  });

  it("returns 413 on oversized decoded body", async () => {
    const big = Buffer.alloc(5_000_001, 97);
    big.write("<html>", 0);
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: big.toString("utf8"),
        isBase64Encoded: false,
      })
    );
    expect(res.statusCode).toBe(413);
  });

  it("returns 415 on non-HTML decoded body", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: "not html at all",
      })
    );
    expect(res.statusCode).toBe(415);
  });

  it("returns 200 with a short share URL and persists token metadata on success", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: "<html><body>x</body></html>",
      })
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}");
    expect(body).toMatchObject({
      url: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
      createdAt: 1778662800,
      expiresAt: 1779267600,
      expiresInDays: 7,
    });
    expect(typeof body.key).toBe("string");
    expect(body.key).toBe("user-1/01HZX3NDEKTSV4RRFFQ69G5BND/");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "test-bucket",
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
          Body: Buffer.from("<html><body>x</body></html>", "utf8"),
          ContentType: "text/html; charset=utf-8",
        },
      })
    );
    expect(putShareRecordMock).toHaveBeenCalledWith({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "index.html",
      paths: ["index.html"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
    });
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it("persists draft metadata and returns draft status when requested", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        queryStringParameters: { filename: "draft.html", draft: "1" },
        body: "<html><head><title> Draft &amp; Review </title></head><body>x</body></html>",
      })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body ?? "{}")).toMatchObject({
      url: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
      draft: true,
    });
    expect(putShareRecordMock).toHaveBeenCalledWith({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "draft.html",
      title: "Draft & Review",
      paths: ["index.html"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
      draft: true,
    });
  });

  it("returns early 413 when Content-Length exceeds limit (plain body)", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-length": String(5_000_001),
        },
        body: "<html>x</html>",
        isBase64Encoded: false,
      })
    );
    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body ?? "{}").error).toMatch(/Content-Length/);
  });

  it("returns early 413 when base64 Content-Length implies decoded size over limit", async () => {
    const len = 7_000_000;
    const implied = Math.ceil((len * 3) / 4);
    expect(implied).toBeGreaterThan(5_000_000);
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-length": String(len),
        },
        body: Buffer.alloc(100, 97).toString("base64"),
        isBase64Encoded: true,
      })
    );
    expect(res.statusCode).toBe(413);
  });

  it("handles base64-encoded API Gateway body", async () => {
    const html = "<html><body>x</body></html>";
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: Buffer.from(html, "utf8").toString("base64"),
        isBase64Encoded: true,
      })
    );
    expect(res.statusCode).toBe(200);
  });

  it("handles plain UTF-8 API Gateway body", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: "<html><body>x</body></html>",
        isBase64Encoded: false,
      })
    );
    expect(res.statusCode).toBe(200);
  });

  it("uploads a zip bundle with index.html and assets", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "index.html":
            '<html><head><title>Bundle</title><link rel="stylesheet" href="assets/app.css"><script type="module" src="assets/app.js"></script></head><body>x</body></html>',
          "assets/app.css": "body { color: rebeccapurple; }",
          "assets/app.js": 'console.log("ok");',
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}");
    expect(body.key).toBe("user-1/01HZX3NDEKTSV4RRFFQ69G5BND/");
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
          ContentType: "text/html; charset=utf-8",
        }),
      })
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.css",
          ContentType: "text/css; charset=utf-8",
        }),
      })
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.js",
          ContentType: "text/javascript; charset=utf-8",
        }),
      })
    );
    expect(putShareRecordMock).toHaveBeenCalledWith({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "index.html",
      title: "Bundle",
      paths: ["index.html", "assets/app.css", "assets/app.js"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
    });
  });

  it("uploads a zip bundle wrapped in a single top-level folder", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "site/index.html":
            '<html><head><link rel="stylesheet" href="assets/app.css"></head><body>x</body></html>',
          "site/assets/app.css": "body { color: rebeccapurple; }",
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
          ContentType: "text/html; charset=utf-8",
        }),
      })
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.css",
          ContentType: "text/css; charset=utf-8",
        }),
      })
    );
  });

  it("rejects a zip bundle without a root index.html", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({ "page.html": "<html><body>x</body></html>" }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body ?? "{}").error).toMatch(/index\.html/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects invalid zip archives with a useful error", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: Buffer.from("not a zip", "utf8").toString("base64"),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body ?? "{}").error).toBe(
      "Bundle is not a valid zip archive"
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects zip bundle paths that traverse upward", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "index.html": "<html><body>x</body></html>",
          "../secret.css": "body {}",
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body ?? "{}").error).toMatch(/Unsafe bundle path/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("ignores common archive noise entries", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "index.html": "<html><body>x</body></html>",
          "__MACOSX/._index.html": "junk",
          ".DS_Store": "junk",
          "assets/Thumbs.db": "junk",
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
        }),
      })
    );
  });

  it("allows up-directory references inside the bundle", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "index.html": '<html><body><a href="docs/page.html">docs</a></body></html>',
          "docs/page.html": '<html><body><a href="../index.html">home</a></body></html>',
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/docs/page.html",
        }),
      })
    );
  });

  it("rejects root-relative references in text-like files", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: {
          authorization: "Bearer ok",
          "content-type": "application/zip",
        },
        body: zipBody({
          "index.html": '<html><body><script src="assets/app.js"></script></body></html>',
          "assets/app.js": 'import "/assets/shared.js";',
        }),
        isBase64Encoded: true,
      })
    );

    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body ?? "{}").error).toMatch(/root-relative reference/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("best-effort cleans up bundle objects when a partial upload fails", async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("s3 exploded"))
      .mockResolvedValueOnce({});

    await expect(
      handleUpload(
        baseEvent({
          headers: {
            authorization: "Bearer ok",
            "content-type": "application/zip",
          },
          body: zipBody({
            "index.html": "<html><body>x</body></html>",
            "assets/app.css": "body {}",
          }),
          isBase64Encoded: true,
        })
      )
    ).rejects.toThrow("s3 exploded");

    expect(sendMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "test-bucket",
          Delete: {
            Objects: [
              { Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html" },
              { Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.css" },
            ],
            Quiet: true,
          },
        },
      })
    );
    expect(deleteShareRecordMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });
});
