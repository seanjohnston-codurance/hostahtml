import { ulid } from "ulid";
import { getShareTokenStore } from "./shareTokenStore.js";

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
  await getShareTokenStore().putShareRecord(record);
}

export async function getShareRecord(token: string): Promise<ShareRecord | null> {
  return getShareTokenStore().getShareRecord(token);
}

export async function deleteShareRecord(token: string): Promise<void> {
  await getShareTokenStore().deleteShareRecord(token);
}
