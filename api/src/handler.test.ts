import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  handleDeleteShareMock,
  handleListSharesMock,
  handleShareGetMock,
  handleUpdateShareDraftMock,
  handleUploadMock,
} = vi.hoisted(() => ({
  handleDeleteShareMock: vi.fn(),
  handleListSharesMock: vi.fn(),
  handleShareGetMock: vi.fn(),
  handleUpdateShareDraftMock: vi.fn(),
  handleUploadMock: vi.fn(),
}));

vi.mock("./shares.js", () => ({
  handleDeleteShare: handleDeleteShareMock,
  handleListShares: handleListSharesMock,
  handleUpdateShareDraft: handleUpdateShareDraftMock,
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
    handleDeleteShareMock.mockReset();
    handleListSharesMock.mockReset();
    handleShareGetMock.mockReset();
    handleUpdateShareDraftMock.mockReset();
    handleUploadMock.mockReset();
    handleDeleteShareMock.mockResolvedValue({ statusCode: 200, body: "{}" });
    handleListSharesMock.mockResolvedValue({ statusCode: 200, body: "{}" });
    handleUpdateShareDraftMock.mockResolvedValue({ statusCode: 200, body: "{}" });
    handleUploadMock.mockResolvedValue({ statusCode: 200, body: "{}" });
  });

  function minimalEvent(
    method: string,
    rawPath: string,
    pathParameters?: Record<string, string>,
    queryStringParameters?: Record<string, string>
  ): import("aws-lambda").APIGatewayProxyEventV2 {
    return {
      version: "2.0",
      routeKey: `${method} ${rawPath}`,
      rawPath,
      rawQueryString: "",
      headers: {},
      queryStringParameters,
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

  it("dispatches nested GET /t/{token}/{path} to the share resolver", async () => {
    handleShareGetMock.mockResolvedValueOnce({ statusCode: 200, body: "" });

    const res = await handler(
      minimalEvent("GET", "/t/01ARZ3NDEKTSV4RRFFQ69G5FAV/assets/app.css", {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        proxy: "assets/app.css",
      })
    );

    expect(handleShareGetMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "assets/app.css"
    );
    expect(res.statusCode).toBe(200);
  });

  it("does not let query parameters determine share draft state", async () => {
    handleShareGetMock.mockResolvedValueOnce({ statusCode: 200, body: "" });

    await handler(
      minimalEvent(
        "GET",
        "/t/01ARZ3NDEKTSV4RRFFQ69G5FAV/",
        {
          token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        },
        { draft: "1" }
      )
    );

    expect(handleShareGetMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ""
    );
  });

  it("accepts API Gateway greedy path parameters named proxy+", async () => {
    handleShareGetMock.mockResolvedValueOnce({ statusCode: 200, body: "" });

    await handler(
      minimalEvent("GET", "/t/01ARZ3NDEKTSV4RRFFQ69G5FAV/assets/app.css", {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "proxy+": "assets/app.css",
      })
    );

    expect(handleShareGetMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "assets/app.css"
    );
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

  it("dispatches GET /shares to handleListShares", async () => {
    const ev = minimalEvent("GET", "/shares");
    await handler(ev);
    expect(handleListSharesMock).toHaveBeenCalledWith(ev);
  });

  it("dispatches PATCH /shares/{token} to handleUpdateShareDraft", async () => {
    const ev = minimalEvent("PATCH", "/shares/01ARZ3NDEKTSV4RRFFQ69G5FAV", {
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    });
    await handler(ev);
    expect(handleUpdateShareDraftMock).toHaveBeenCalledWith(
      ev,
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("dispatches DELETE /shares/{token} to handleDeleteShare", async () => {
    const ev = minimalEvent("DELETE", "/shares/01ARZ3NDEKTSV4RRFFQ69G5FAV", {
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    });
    await handler(ev);
    expect(handleDeleteShareMock).toHaveBeenCalledWith(
      ev,
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("returns 404 for unknown paths", async () => {
    const res = await handler(minimalEvent("GET", "/nope"));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Not found" });
  });
});
