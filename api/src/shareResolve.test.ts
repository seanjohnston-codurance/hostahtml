import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { getShareRecordMock, getSignedUrlMock, sendMock } = vi.hoisted(() => ({
  getShareRecordMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("./shareTokens.js", () => ({
  getShareRecord: getShareRecordMock,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = sendMock;
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

import { handleShareGet } from "./shareResolve.js";

describe("handleShareGet", () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = "test-bucket";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00.000Z"));
    getShareRecordMock.mockReset();
    getSignedUrlMock.mockReset();
    sendMock.mockReset();
    getSignedUrlMock.mockResolvedValue("https://signed.example/fresh");
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new TextEncoder().encode("body") },
      ContentType: "text/html; charset=utf-8",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects valid share tokens to a fresh short-lived presigned URL", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      s3Key: "user-1/object.html",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });

    const res = await handleShareGet("01arz3ndektsv4rrffq69g5fav");

    expect(res.statusCode).toBe(302);
    expect(res.headers).toMatchObject({
      Location: "https://signed.example/fresh",
      "Cache-Control": "private, no-store",
    });
    expect(getShareRecordMock).toHaveBeenCalledWith("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: { Bucket: "test-bucket", Key: "user-1/object.html" },
      }),
      { expiresIn: 300 }
    );
  });

  it("returns 404 when the token is missing", async () => {
    getShareRecordMock.mockResolvedValue(null);

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(res.statusCode).toBe(404);
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the token has expired", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      s3Key: "user-1/object.html",
      createdAt: 1778650000,
      expiresAt: 1778662799,
    });

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(res.statusCode).toBe(404);
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the token has been revoked", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      s3Key: "user-1/object.html",
      createdAt: 1778660000,
      expiresAt: 1778666400,
      revoked: true,
    });

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(res.statusCode).toBe(404);
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it("returns 404 without reading DynamoDB when the token is malformed", async () => {
    const res = await handleShareGet("not-a-token");

    expect(res.statusCode).toBe(404);
    expect(getShareRecordMock).not.toHaveBeenCalled();
  });

  it("serves bundle index HTML through the token namespace", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });
    sendMock.mockResolvedValue({
      Body: {
        transformToByteArray: async () =>
          new TextEncoder().encode("<html><body>bundle</body></html>"),
      },
      ContentType: "text/html; charset=utf-8",
    });

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV", "");

    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    expect(res.body).toBe("<html><body>bundle</body></html>");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "test-bucket",
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
        },
      })
    );
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it("redirects bundle share URLs to the trailing-slash namespace", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(res.statusCode).toBe(302);
    expect(res.headers).toMatchObject({
      Location: "/t/01ARZ3NDEKTSV4RRFFQ69G5FAV/",
      "Cache-Control": "private, no-store",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("adds a prominent draft watermark to persisted draft share HTML responses", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
      draft: true,
    });
    sendMock.mockResolvedValue({
      Body: {
        transformToByteArray: async () =>
          new TextEncoder().encode("<html><body><main>bundle</main></body></html>"),
      },
      ContentType: "text/html; charset=utf-8",
    });

    const res = await handleShareGet("01ARZ3NDEKTSV4RRFFQ69G5FAV", "");

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("DRAFT");
    expect(res.body).toContain("NOT FOR CIRCULATION");
    expect(res.body).toContain("<main>bundle</main>");
  });

  it("does not watermark non-HTML persisted draft assets", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
      draft: true,
    });
    sendMock.mockResolvedValue({
      Body: {
        transformToByteArray: async () =>
          new TextEncoder().encode("body { color: red; }"),
      },
      ContentType: "text/css; charset=utf-8",
    });

    const res = await handleShareGet(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "assets/app.css"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("body { color: red; }");
  });

  it("serves bundle assets through the token namespace", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });
    sendMock.mockResolvedValue({
      Body: {
        transformToByteArray: async () =>
          new TextEncoder().encode("body { color: red; }"),
      },
      ContentType: "text/css; charset=utf-8",
    });

    const res = await handleShareGet(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "assets/app.css"
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      "Content-Type": "text/css; charset=utf-8",
    });
    expect(res.body).toBe("body { color: red; }");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "test-bucket",
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.css",
        },
      })
    );
  });

  it("normalizes bundle paths that stay inside the bundle root", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });

    const res = await handleShareGet(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "docs/../index.html"
    );

    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "test-bucket",
          Key: "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
        },
      })
    );
  });

  it("returns 404 for bundle paths that traverse upward", async () => {
    getShareRecordMock.mockResolvedValue({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      createdAt: 1778660000,
      expiresAt: 1778666400,
    });

    const res = await handleShareGet(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "../secret.css"
    );

    expect(res.statusCode).toBe(404);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
