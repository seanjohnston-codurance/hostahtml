import { describe, it, expect, vi, beforeEach } from "vitest";

const { handleUploadMock } = vi.hoisted(() => ({
  handleUploadMock: vi.fn(),
}));

vi.mock("./upload.js", () => ({
  handleUpload: handleUploadMock,
}));

import { handler } from "./handler.js";

describe("handler", () => {
  beforeEach(() => {
    handleUploadMock.mockReset();
    handleUploadMock.mockResolvedValue({ statusCode: 200, body: "{}" });
  });

  function minimalEvent(
    method: string,
    path: string
  ): import("aws-lambda").APIGatewayProxyEventV2 {
    return {
      version: "2.0",
      routeKey: `${method} ${path}`,
      rawPath: path,
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "acc",
        apiId: "api",
        domainName: "x",
        domainPrefix: "x",
        http: {
          method,
          path,
          protocol: "HTTP/1.1",
          sourceIp: "1.1.1.1",
          userAgent: "t",
        },
        requestId: "r",
        routeKey: `${method} ${path}`,
        stage: "$default",
        time: "t",
        timeEpoch: 0,
      },
      isBase64Encoded: false,
    } as import("aws-lambda").APIGatewayProxyEventV2;
  }

  it("returns 200 for GET /", async () => {
    const res = await handler(minimalEvent("GET", "/"));
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"status":"ok"}');
    expect(res.headers?.["content-type"]).toBe(
      "application/json; charset=utf-8"
    );
  });

  it("dispatches POST /upload to handleUpload", async () => {
    const ev = minimalEvent("POST", "/upload");
    await handler(ev);
    expect(handleUploadMock).toHaveBeenCalledWith(ev);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await handler(minimalEvent("GET", "/nope"));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Not found" });
  });
});
