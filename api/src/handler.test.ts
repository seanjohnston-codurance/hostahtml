import { describe, it, expect, vi, beforeEach } from "vitest";

const { handleShareGetMock, handleUploadMock } = vi.hoisted(() => ({
  handleShareGetMock: vi.fn(),
  handleUploadMock: vi.fn(),
}));

vi.mock("./shareResolve.js", () => ({
  handleShareGet: handleShareGetMock,
}));

vi.mock("./upload.js", () => ({
  handleUpload: handleUploadMock,
}));

import { handler } from "./handler.js";

describe("handler", () => {
  beforeEach(() => {
    handleShareGetMock.mockReset();
    handleUploadMock.mockReset();
    handleUploadMock.mockResolvedValue({ statusCode: 200, body: "{}" });
  });

  function minimalEvent(
    method: string,
    rawPath: string,
    pathParameters?: Record<string, string>
  ): import("aws-lambda").APIGatewayProxyEventV2 {
    return {
      version: "2.0",
      routeKey: `${method} ${rawPath}`,
      rawPath,
      rawQueryString: "",
      headers: {},
      requestContext: {
        accountId: "acc",
        apiId: "api",
        domainName: "x.execute-api.region.amazonaws.com",
        domainPrefix: "x",
        http: {
          method,
          path: rawPath,
          protocol: "HTTP/1.1",
          sourceIp: "1.2.3.4",
          userAgent: "vitest",
        },
        requestId: "rid",
        routeKey: `${method} ${rawPath}`,
        stage: "$default",
        time: "01/Jan/2020:00:00:00 +0000",
        timeEpoch: 0,
      },
      isBase64Encoded: false,
      pathParameters,
    } as import("aws-lambda").APIGatewayProxyEventV2;
  }

  it("dispatches GET /t/{token} to the share resolver", async () => {
    handleShareGetMock.mockResolvedValueOnce({ statusCode: 302, body: "" });

    const res = await handler(
      minimalEvent("GET", "/t/01ARZ3NDEKTSV4RRFFQ69G5FAV", {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      })
    );

    expect(handleShareGetMock).toHaveBeenCalledWith("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(res.statusCode).toBe(302);
  });

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
