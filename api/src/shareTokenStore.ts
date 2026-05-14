import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShareRecord } from "./shareTokens.js";

export type ShareTokenStore = {
  putShareRecord(record: ShareRecord): Promise<void>;
  getShareRecord(token: string): Promise<ShareRecord | null>;
  listShareRecordsByOwner(ownerUserId: string, now: number): Promise<ShareRecord[]>;
  updateShareRecordDraft(
    token: string,
    ownerUserId: string,
    draft: boolean,
    now: number
  ): Promise<ShareRecord | null>;
  markShareRecordDeleted(
    token: string,
    ownerUserId: string,
    now: number
  ): Promise<ShareRecord | null>;
  deleteShareRecord(token: string): Promise<void>;
};

const OWNER_EXPIRES_AT_INDEX = "OwnerExpiresAtIndex";

let shareTokenStore: ShareTokenStore | undefined;

export function getShareTokenStore(): ShareTokenStore {
  shareTokenStore ??=
    process.env.HOSTAHTML_STORAGE === "filesystem"
      ? createFilesystemShareTokenStore(localDataRoot())
      : createAwsShareTokenStore();
  return shareTokenStore;
}

export function setShareTokenStoreForTest(
  store: ShareTokenStore | undefined
): void {
  shareTokenStore = store;
}

export function createFilesystemShareTokenStore(root: string): ShareTokenStore {
  const tokenRoot = path.resolve(root, "tokens");
  return {
    async putShareRecord(record) {
      const recordPath = safeTokenPath(tokenRoot, record.token);
      await mkdir(path.dirname(recordPath), { recursive: true });
      await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    },
    async getShareRecord(token) {
      try {
        return JSON.parse(
          await readFile(safeTokenPath(tokenRoot, token), "utf8")
        ) as ShareRecord;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async listShareRecordsByOwner(ownerUserId, now) {
      try {
        const entries = await readdir(tokenRoot);
        const records = await Promise.all(
          entries
            .filter((entry) => entry.endsWith(".json"))
            .map(async (entry) => {
              const body = await readFile(path.join(tokenRoot, entry), "utf8");
              return JSON.parse(body) as ShareRecord;
            })
        );
        return records.filter(
          (record) =>
            record.ownerUserId === ownerUserId && record.expiresAt > now
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      }
    },
    async updateShareRecordDraft(token, ownerUserId, draft, now) {
      const record = await this.getShareRecord(token);
      if (!isOwnedUnexpiredRecord(record, ownerUserId, now)) return null;
      const updated = { ...record, draft };
      await this.putShareRecord(updated);
      return updated;
    },
    async markShareRecordDeleted(token, ownerUserId, now) {
      const record = await this.getShareRecord(token);
      if (!isOwnedUnexpiredRecord(record, ownerUserId, now)) return null;
      const updated = { ...record, revoked: true };
      await this.putShareRecord(updated);
      return updated;
    },
    async deleteShareRecord(token) {
      await rm(safeTokenPath(tokenRoot, token), { force: true });
    },
  };
}

function createAwsShareTokenStore(): ShareTokenStore {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return {
    async putShareRecord(record) {
      await ddb.send(
        new PutCommand({
          TableName: process.env.TOKENS_TABLE_NAME!,
          Item: record,
        })
      );
    },
    async getShareRecord(token) {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.TOKENS_TABLE_NAME!,
          Key: { token },
          ConsistentRead: true,
        })
      );
      return (result.Item as ShareRecord | undefined) ?? null;
    },
    async listShareRecordsByOwner(ownerUserId, now) {
      const result = await ddb.send(
        new QueryCommand({
          TableName: process.env.TOKENS_TABLE_NAME!,
          IndexName: OWNER_EXPIRES_AT_INDEX,
          KeyConditionExpression:
            "ownerUserId = :ownerUserId AND expiresAt > :now",
          ExpressionAttributeValues: {
            ":ownerUserId": ownerUserId,
            ":now": now,
          },
        })
      );
      return (result.Items as ShareRecord[] | undefined) ?? [];
    },
    async updateShareRecordDraft(token, ownerUserId, draft, now) {
      try {
        const result = await ddb.send(
          new UpdateCommand({
            TableName: process.env.TOKENS_TABLE_NAME!,
            Key: { token },
            UpdateExpression: "SET draft = :draft",
            ConditionExpression:
              "ownerUserId = :ownerUserId AND expiresAt > :now",
            ExpressionAttributeValues: {
              ":draft": draft,
              ":ownerUserId": ownerUserId,
              ":now": now,
            },
            ReturnValues: "ALL_NEW",
          })
        );
        return (result.Attributes as ShareRecord | undefined) ?? null;
      } catch (error) {
        if (isConditionalCheckFailed(error)) return null;
        throw error;
      }
    },
    async markShareRecordDeleted(token, ownerUserId, now) {
      try {
        const result = await ddb.send(
          new UpdateCommand({
            TableName: process.env.TOKENS_TABLE_NAME!,
            Key: { token },
            UpdateExpression: "SET revoked = :revoked",
            ConditionExpression:
              "ownerUserId = :ownerUserId AND expiresAt > :now",
            ExpressionAttributeValues: {
              ":revoked": true,
              ":ownerUserId": ownerUserId,
              ":now": now,
            },
            ReturnValues: "ALL_NEW",
          })
        );
        return (result.Attributes as ShareRecord | undefined) ?? null;
      } catch (error) {
        if (isConditionalCheckFailed(error)) return null;
        throw error;
      }
    },
    async deleteShareRecord(token) {
      await ddb.send(
        new DeleteCommand({
          TableName: process.env.TOKENS_TABLE_NAME!,
          Key: { token },
        })
      );
    },
  };
}

function isOwnedUnexpiredRecord(
  record: ShareRecord | null,
  ownerUserId: string,
  now: number
): record is ShareRecord {
  return record?.ownerUserId === ownerUserId && record.expiresAt > now;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}

function localDataRoot(): string {
  return process.env.HOSTAHTML_LOCAL_DATA_DIR ?? ".hostahtml-local";
}

function safeTokenPath(root: string, token: string): string {
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(token)) {
    throw new Error(`Unsafe share token: ${token}`);
  }

  const resolved = path.resolve(root, `${token}.json`);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe share token: ${token}`);
  }
  return resolved;
}
