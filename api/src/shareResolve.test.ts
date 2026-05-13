import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { getShareRecordMock, getSignedUrlMock } = vi.hoisted(() => ({
  getShareRecordMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
}));

vi.mock("./shareTokens.js", () => ({
  getShareRecord: getShareRecordMock,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {},
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
    getSignedUrlMock.mockResolvedValue("https://signed.example/fresh");
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
});
