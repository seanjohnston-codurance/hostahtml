import { describe, it, expect, vi, beforeEach } from "vitest";

const { verifyGoogleTokenMock, sendMock, getSignedUrlMock } = vi.hoisted(
  () => ({
    verifyGoogleTokenMock: vi.fn(),
    sendMock: vi.fn(),
    getSignedUrlMock: vi.fn(),
  })
);

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

import { handleUpload } from "./upload.js";

describe("handleUpload", () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = "test-bucket";
    process.env.GOOGLE_CLIENT_ID = "cid";
    verifyGoogleTokenMock.mockReset();
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
    verifyGoogleTokenMock.mockResolvedValue("user-1");
    sendMock.mockResolvedValue({});
    getSignedUrlMock.mockResolvedValue("https://signed.example/object");
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

  it("returns 200 with UploadResponse shape on success", async () => {
    const res = await handleUpload(
      baseEvent({
        headers: { authorization: "Bearer ok" },
        body: "<html><body>x</body></html>",
      })
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}");
    expect(body).toMatchObject({
      url: "https://signed.example/object",
      expiresInDays: 7,
    });
    expect(typeof body.key).toBe("string");
    expect(body.key).toMatch(/^user-1\/[0-9a-f-]{36}-\d+-/);
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
});
