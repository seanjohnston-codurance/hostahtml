import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export type ShareRecord = {
  token: string;
  s3Key?: string;
  ownerUserId?: string;
  bundleId?: string;
  createdAt: number;
  expiresAt: number;
  draft?: boolean;
  revoked?: boolean;
};

export function mintToken(): string {
  return ulid();
}

export function mintBundleId(): string {
  return ulid();
}

export async function putShareRecord(record: ShareRecord): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: process.env.TOKENS_TABLE_NAME!,
      Item: record,
    })
  );
}

export async function getShareRecord(token: string): Promise<ShareRecord | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: process.env.TOKENS_TABLE_NAME!,
      Key: { token },
      ConsistentRead: true,
    })
  );

  return (result.Item as ShareRecord | undefined) ?? null;
}

export async function deleteShareRecord(token: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: process.env.TOKENS_TABLE_NAME!,
      Key: { token },
    })
  );
}
