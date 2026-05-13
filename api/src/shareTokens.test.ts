import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: sendMock }),
  },
  GetCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  PutCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  DeleteCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { normalizeShareToken } from "./shareTokenFormat.js";
import { getShareRecord, mintToken, putShareRecord } from "./shareTokens.js";

describe("shareTokens", () => {
  beforeEach(() => {
    process.env.TOKENS_TABLE_NAME = "share-tokens";
    sendMock.mockReset();
  });

  it("reads share records with a strongly consistent DynamoDB lookup", async () => {
    sendMock.mockResolvedValueOnce({
      Item: {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        s3Key: "user-1/object.html",
        createdAt: 1778662800,
        expiresAt: 1779267600,
      },
    });

    const record = await getShareRecord("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(record).toMatchObject({
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      s3Key: "user-1/object.html",
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: "share-tokens",
          Key: { token: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
          ConsistentRead: true,
        },
      })
    );
  });

  it("returns null when a share token does not exist", async () => {
    sendMock.mockResolvedValueOnce({});

    const record = await getShareRecord("01ARZ3NDEKTSV4RRFFQ69G5FAV");

    expect(record).toBeNull();
  });

  it("persists share token metadata to DynamoDB", async () => {
    const record = {
      token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      s3Key: "user-1/object.html",
      createdAt: 1778662800,
      expiresAt: 1779267600,
    };

    await putShareRecord(record);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: "share-tokens",
          Item: record,
        },
      })
    );
  });

  it("mints tokens accepted by share resolution", () => {
    const token = mintToken();

    expect(normalizeShareToken(token)).toBe(token);
    expect(normalizeShareToken(token.toLowerCase())).toBe(token);
  });
});
