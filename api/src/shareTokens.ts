import { ulid } from "ulid";
import { getShareTokenStore } from "./shareTokenStore.js";

export type ShareRecord = {
  token: string;
  s3Key?: string;
  ownerUserId?: string;
  bundleId?: string;
  filename?: string;
  title?: string;
  paths?: string[];
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

export async function listShareRecordsByOwner(
  ownerUserId: string,
  now: number
): Promise<ShareRecord[]> {
  return getShareTokenStore().listShareRecordsByOwner(ownerUserId, now);
}

export async function updateShareRecordDraft(
  token: string,
  ownerUserId: string,
  draft: boolean,
  now: number
): Promise<ShareRecord | null> {
  return getShareTokenStore().updateShareRecordDraft(
    token,
    ownerUserId,
    draft,
    now
  );
}

export async function markShareRecordDeleted(
  token: string,
  ownerUserId: string,
  now: number
): Promise<ShareRecord | null> {
  return getShareTokenStore().markShareRecordDeleted(token, ownerUserId, now);
}

export async function deleteShareRecord(token: string): Promise<void> {
  await getShareTokenStore().deleteShareRecord(token);
}
