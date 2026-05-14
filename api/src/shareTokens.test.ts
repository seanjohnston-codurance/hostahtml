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
  QueryCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  UpdateCommand: class {
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
import {
  getShareRecord,
  listShareRecordsByOwner,
  markShareRecordDeleted,
  mintToken,
  putShareRecord,
  updateShareRecordDraft,
} from "./shareTokens.js";

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

  it("queries active share records by owner and expiry", async () => {
    sendMock.mockResolvedValueOnce({
      Items: [
        {
          token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          ownerUserId: "user-1",
          bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
          filename: "page.html",
          paths: ["index.html"],
          createdAt: 1778662800,
          expiresAt: 1779267600,
        },
      ],
    });

    const records = await listShareRecordsByOwner("user-1", 1778662800);

    expect(records).toHaveLength(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: "share-tokens",
          IndexName: "OwnerExpiresAtIndex",
          KeyConditionExpression:
            "ownerUserId = :ownerUserId AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":ownerUserId": "user-1",
            ":now": 1778662800,
          },
        },
      })
    );
  });

  it("updates draft metadata only for owned unexpired share records", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "user-1",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        draft: false,
        createdAt: 1778662800,
        expiresAt: 1779267600,
      },
    });

    const record = await updateShareRecordDraft(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "user-1",
      false,
      1778662800
    );

    expect(record?.draft).toBe(false);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: "share-tokens",
          Key: { token: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
          UpdateExpression: "SET draft = :draft",
          ConditionExpression:
            "ownerUserId = :ownerUserId AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":draft": false,
            ":ownerUserId": "user-1",
            ":now": 1778662800,
          },
          ReturnValues: "ALL_NEW",
        },
      })
    );
  });

  it("marks share records deleted with an ownership and expiry condition", async () => {
    sendMock.mockResolvedValueOnce({
      Attributes: {
        token: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerUserId: "user-1",
        bundleId: "01HZX3NDEKTSV4RRFFQ69G5BND",
        revoked: true,
        createdAt: 1778662800,
        expiresAt: 1779267600,
      },
    });

    const record = await markShareRecordDeleted(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "user-1",
      1778662800
    );

    expect(record?.revoked).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: "share-tokens",
          Key: { token: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
          UpdateExpression: "SET revoked = :revoked",
          ConditionExpression:
            "ownerUserId = :ownerUserId AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":revoked": true,
            ":ownerUserId": "user-1",
            ":now": 1778662800,
          },
          ReturnValues: "ALL_NEW",
        },
      })
    );
  });

  it("returns null when a conditional mutation is rejected", async () => {
    const error = new Error("nope");
    error.name = "ConditionalCheckFailedException";
    sendMock.mockRejectedValueOnce(error);

    await expect(
      markShareRecordDeleted(
        "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "user-1",
        1778662800
      )
    ).resolves.toBeNull();
  });

  it("mints tokens accepted by share resolution", () => {
    const token = mintToken();

    expect(normalizeShareToken(token)).toBe(token);
    expect(normalizeShareToken(token.toLowerCase())).toBe(token);
  });
});
