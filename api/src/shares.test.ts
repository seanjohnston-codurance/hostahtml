import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  deleteObjectsMock,
  listShareRecordsByOwnerMock,
  markShareRecordDeletedMock,
  updateShareRecordDraftMock,
  verifyGoogleTokenMock,
} = vi.hoisted(() => ({
  deleteObjectsMock: vi.fn(),
  listShareRecordsByOwnerMock: vi.fn(),
  markShareRecordDeletedMock: vi.fn(),
  updateShareRecordDraftMock: vi.fn(),
  verifyGoogleTokenMock: vi.fn(),
}));

vi.mock("./auth.js", () => ({
  verifyGoogleToken: verifyGoogleTokenMock,
}));

vi.mock("./shareTokens.js", () => ({
  listShareRecordsByOwner: listShareRecordsByOwnerMock,
  markShareRecordDeleted: markShareRecordDeletedMock,
  updateShareRecordDraft: updateShareRecordDraftMock,
}));

vi.mock("./objectStore.js", () => ({
  getObjectStore: () => ({
    deleteObjects: deleteObjectsMock,
  }),
}));

import {
  handleDeleteShare,
  handleListShares,
  handleUpdateShareDraft,
} from "./shares.js";

describe("dashboard shares API", () => {
  beforeEach(() => {
    process.env.SHARE_BASE_URL = "https://share.example/";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00.000Z"));
    verifyGoogleTokenMock.mockReset();
    deleteObjectsMock.mockReset();
    listShareRecordsByOwnerMock.mockReset();
    markShareRecordDeletedMock.mockReset();
    updateShareRecordDraftMock.mockReset();
    verifyGoogleTokenMock.mockResolvedValue("user-1");
    deleteObjectsMock.mockResolvedValue(undefined);
    listShareRecordsByOwnerMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function event(
    headers: Record<string, string> = { authorization: "Bearer ok" },
    body?: string
  ): import("aws-lambda").APIGatewayProxyEventV2 {
    return {
      version: "2.0",
      routeKey: "GET /shares",
      rawPath: "/shares",
      rawQueryString: "",
      headers,
      requestContext: {
        accountId: "acc",
        apiId: "api",
        domainName: "x.execute-api.region.amazonaws.com",
        domainPrefix: "x",
        http: {
          method: "GET",
          path: "/shares",
          protocol: "HTTP/1.1",
          sourceIp: "1.2.3.4",
          userAgent: "vitest",
        },
        requestId: "rid",
        routeKey: "GET /shares",
        stage: "$default",
        time: "01/Jan/2020:00:00:00 +0000",
        timeEpoch: 0,
      },
      isBase64Encoded: false,
      body,
    } as import("aws-lambda").APIGatewayProxyEventV2;
  }

  it("lists unexpired shares for the authenticated owner", async () => {
    listShareRecordsByOwnerMock.mockResolvedValueOnce([
      {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "user-1",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        filename: "page.html",
        title: "Page Title",
        paths: ["index.html"],
        createdAt: 1778662800,
        expiresAt: 1779267600,
        draft: true,
      },
      {
        token: "01BRZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "user-1",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5DEL",
        filename: "deleted.html",
        paths: ["index.html"],
        createdAt: 1778662900,
        expiresAt: 1779267700,
        revoked: true,
      },
    ]);

    const res = await handleListShares(event());

    expect(res.statusCode).toBe(200);
    expect(listShareRecordsByOwnerMock).toHaveBeenCalledWith(
      "user-1",
      1778662800
    );
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      shares: [
        {
          token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          url: "https://share.example/t/01ARZ3NDEKTSV4RRFFQ69G5FAV",
          filename: "page.html",
          title: "Page Title",
          createdAt: 1778662800,
          expiresAt: 1779267600,
          draft: true,
          deleted: false,
        },
        {
          token: "01BRZ3NDEKTSV4RRFFQ69G5FAV",
          url: "https://share.example/t/01BRZ3NDEKTSV4RRFFQ69G5FAV",
          filename: "deleted.html",
          createdAt: 1778662900,
          expiresAt: 1779267700,
          draft: false,
          deleted: true,
        },
      ],
    });
  });

  it("returns 401 when the bearer token is missing", async () => {
    const res = await handleListShares(event({}));

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Missing token" });
    expect(listShareRecordsByOwnerMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is invalid", async () => {
    verifyGoogleTokenMock.mockRejectedValueOnce(new Error("bad"));

    const res = await handleListShares(event());

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Invalid token" });
    expect(listShareRecordsByOwnerMock).not.toHaveBeenCalled();
  });

  it("updates draft state for an owned unexpired share", async () => {
    updateShareRecordDraftMock.mockResolvedValueOnce({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "page.html",
      paths: ["index.html"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
      draft: false,
    });

    const res = await handleUpdateShareDraft(
      event({ authorization: "Bearer ok" }, '{"draft":false}'),
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );

    expect(res.statusCode).toBe(200);
    expect(updateShareRecordDraftMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "user-1",
      false,
      1778662800
    );
    expect(JSON.parse(res.body ?? "{}").share).toMatchObject({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      draft: false,
      deleted: false,
    });
  });

  it("returns the not-found shape when a mutation target is unavailable", async () => {
    updateShareRecordDraftMock.mockResolvedValueOnce(null);

    const res = await handleUpdateShareDraft(
      event({ authorization: "Bearer ok" }, '{"draft":true}'),
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Not found" });
  });

  it("marks shares deleted and deletes the exact persisted object paths", async () => {
    markShareRecordDeletedMock.mockResolvedValueOnce({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "page.html",
      paths: ["index.html", "assets/app.css"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
      revoked: true,
    });

    const res = await handleDeleteShare(
      event(),
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );

    expect(res.statusCode).toBe(200);
    expect(markShareRecordDeletedMock).toHaveBeenCalledWith(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "user-1",
      1778662800
    );
    expect(deleteObjectsMock).toHaveBeenCalledWith([
      "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/index.html",
      "user-1/01HZX3NDEKTSV4RRFFQ69G5BND/assets/app.css",
    ]);
    expect(JSON.parse(res.body ?? "{}").share).toMatchObject({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      deleted: true,
    });
  });

  it("still returns deleted when object cleanup fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    markShareRecordDeletedMock.mockResolvedValueOnce({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      ownerUserId: "user-1",
      bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
      filename: "page.html",
      paths: ["index.html"],
      createdAt: 1778662800,
      expiresAt: 1779267600,
      revoked: true,
    });
    deleteObjectsMock.mockRejectedValueOnce(new Error("s3"));

    const res = await handleDeleteShare(
      event(),
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body ?? "{}").share.deleted).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      "Failed to clean up deleted share objects",
      expect.any(Error)
    );
    warn.mockRestore();
  });
});
