import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShareRecord } from "./shareTokens.js";

export type ShareTokenStore = {
  putShareRecord(record: ShareRecord): Promise<void>;
  getShareRecord(token: string): Promise<ShareRecord | null>;
  deleteShareRecord(token: string): Promise<void>;
};

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
