import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import type {
  ErrorResponse,
  ListSharesResponse,
  ShareSummary,
  UpdateShareResponse,
} from "@hostahtml/shared";
import { verifyGoogleToken } from "./auth.js";
import { jsonResponse } from "./jsonResponse.js";
import {
  listShareRecordsByOwner,
  markShareRecordDeleted,
  updateShareRecordDraft,
  type ShareRecord,
} from "./shareTokens.js";
import { normalizeShareToken } from "./shareTokenFormat.js";
import { getObjectStore } from "./objectStore.js";

export async function handleListShares(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const auth = await authenticate(event);
  if (auth.status === "missing") {
    return jsonResponse(401, { error: "Missing token" } satisfies ErrorResponse);
  }
  if (auth.status === "invalid") {
    return jsonResponse(401, { error: "Invalid token" } satisfies ErrorResponse);
  }

  const now = Math.floor(Date.now() / 1000);
  const records = await listShareRecordsByOwner(auth.userId, now);
  return jsonResponse(200, {
    shares: records.map(toShareSummary),
  } satisfies ListSharesResponse);
}

export async function handleUpdateShareDraft(
  event: APIGatewayProxyEventV2,
  token: string | undefined
): Promise<APIGatewayProxyStructuredResultV2> {
  const auth = await authenticate(event);
  if (auth.status === "missing") {
    return jsonResponse(401, { error: "Missing token" } satisfies ErrorResponse);
  }
  if (auth.status === "invalid") {
    return jsonResponse(401, { error: "Invalid token" } satisfies ErrorResponse);
  }

  const normalizedToken = normalizeShareToken(token);
  if (!normalizedToken) return notFound();

  let draft: boolean;
  try {
    draft = parseDraftUpdate(event.body);
  } catch {
    return jsonResponse(400, { error: "Invalid request" } satisfies ErrorResponse);
  }

  const record = await updateShareRecordDraft(
    normalizedToken,
    auth.userId,
    draft,
    Math.floor(Date.now() / 1000)
  );
  if (!record) return notFound();

  return jsonResponse(200, {
    share: toShareSummary(record),
  } satisfies UpdateShareResponse);
}

export async function handleDeleteShare(
  event: APIGatewayProxyEventV2,
  token: string | undefined
): Promise<APIGatewayProxyStructuredResultV2> {
  const auth = await authenticate(event);
  if (auth.status === "missing") {
    return jsonResponse(401, { error: "Missing token" } satisfies ErrorResponse);
  }
  if (auth.status === "invalid") {
    return jsonResponse(401, { error: "Invalid token" } satisfies ErrorResponse);
  }

  const normalizedToken = normalizeShareToken(token);
  if (!normalizedToken) return notFound();

  const record = await markShareRecordDeleted(
    normalizedToken,
    auth.userId,
    Math.floor(Date.now() / 1000)
  );
  if (!record) return notFound();

  await cleanupShareObjects(record);
  return jsonResponse(200, {
    share: toShareSummary(record),
  } satisfies UpdateShareResponse);
}

async function authenticate(
  event: APIGatewayProxyEventV2
): Promise<
  | { status: "authenticated"; userId: string }
  | { status: "missing" }
  | { status: "invalid" }
> {
  const authHeader =
    event.headers.authorization ?? event.headers.Authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return { status: "missing" };

  try {
    return { status: "authenticated", userId: await verifyGoogleToken(token) };
  } catch {
    return { status: "invalid" };
  }
}

function toShareSummary(record: ShareRecord): ShareSummary {
  return {
    token: record.token,
    url: `${shareBaseUrl()}/t/${record.token}`,
    filename: record.filename ?? "index.html",
    ...(record.title ? { title: record.title } : {}),
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    draft: record.draft === true,
    deleted: record.revoked === true,
  };
}

function shareBaseUrl(): string {
  return process.env.SHARE_BASE_URL!.replace(/\/+$/, "");
}

function parseDraftUpdate(body: string | undefined): boolean {
  const parsed = JSON.parse(body ?? "{}") as { draft?: unknown };
  if (typeof parsed.draft !== "boolean") {
    throw new Error("draft must be boolean");
  }
  return parsed.draft;
}

async function cleanupShareObjects(record: ShareRecord): Promise<void> {
  if (!record.ownerUserId || !record.bundleId || !record.paths) return;
  try {
    await getObjectStore().deleteObjects(
      record.paths.map(
        (relativePath) =>
          `${record.ownerUserId}/${record.bundleId}/${relativePath}`
      )
    );
  } catch (error) {
    console.warn("Failed to clean up deleted share objects", error);
  }
}

function notFound(): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(404, { error: "Not found" } satisfies ErrorResponse);
}
