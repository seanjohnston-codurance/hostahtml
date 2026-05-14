import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import type { ErrorResponse, UploadResponse } from "@hostahtml/shared";
import { verifyGoogleToken } from "./auth.js";
import {
  decodeBody,
  getContentLength,
  MAX_UPLOAD_BYTES,
} from "./validate.js";
import { jsonResponse } from "./jsonResponse.js";
import {
  deleteShareRecord,
  mintBundleId,
  mintToken,
  putShareRecord,
} from "./shareTokens.js";
import {
  buildSingleHtmlBundleManifest,
  buildZipBundleManifest,
} from "./bundles.js";
import { getObjectStore } from "./objectStore.js";

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export async function handleUpload(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const authHeader =
    event.headers.authorization ?? event.headers.Authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) {
    return jsonResponse(401, { error: "Missing token" } satisfies ErrorResponse);
  }

  let userId: string;
  try {
    userId = await verifyGoogleToken(token);
  } catch {
    return jsonResponse(401, { error: "Invalid token" } satisfies ErrorResponse);
  }

  const declaredLen = getContentLength(event.headers);
  if (declaredLen !== undefined) {
    if (!event.isBase64Encoded && declaredLen > MAX_UPLOAD_BYTES) {
      return jsonResponse(413, {
        error: `File too large (Content-Length ${declaredLen} > ${MAX_UPLOAD_BYTES})`,
      } satisfies ErrorResponse);
    }
    if (event.isBase64Encoded) {
      // Decoded size is at most ceil(n * 3 / 4) for a base64 payload of length n (padding ignored).
      const maxDecodedUpperBound = Math.ceil((declaredLen * 3) / 4);
      if (maxDecodedUpperBound > MAX_UPLOAD_BYTES) {
        return jsonResponse(413, {
          error: `File too large (declared base64 length implies payload > ${MAX_UPLOAD_BYTES} bytes)`,
        } satisfies ErrorResponse);
      }
    }
  }

  let bodyBuf: Buffer;
  try {
    bodyBuf = decodeBody(event.body, event.isBase64Encoded ?? false);
  } catch (e) {
    throw e;
  }

  const bundleId = mintBundleId();
  let manifest: ReturnType<typeof buildSingleHtmlBundleManifest>;
  try {
    manifest = isZipUpload(event)
      ? buildZipBundleManifest(userId, bundleId, bodyBuf)
      : buildSingleHtmlBundleManifest(userId, bundleId, bodyBuf);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("File too large")) {
      return jsonResponse(413, { error: msg } satisfies ErrorResponse);
    }
    if (msg.includes("too large")) {
      return jsonResponse(413, { error: msg } satisfies ErrorResponse);
    }
    if (
      msg.includes("does not look like HTML") ||
      msg.includes("Bundle") ||
      msg.includes("Unsafe") ||
      msg.includes("Duplicate")
    ) {
      return jsonResponse(415, { error: msg } satisfies ErrorResponse);
    }
    throw e;
  }

  const shareToken = mintToken();
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + SEVEN_DAYS;
  const draft = isDraftUpload(event);
  try {
    for (const file of manifest.files) {
      await getObjectStore().putObject({
        key: `${manifest.ownerUserId}/${manifest.bundleId}/${file.relativePath}`,
        body: file.body,
        contentType: file.contentType,
      });
    }

    await putShareRecord({
      token: shareToken,
      ownerUserId: userId,
      bundleId,
      filename: uploadFilename(event),
      ...optionalTitle(extractRootTitle(manifest)),
      paths: manifest.files.map((file) => file.relativePath),
      createdAt,
      expiresAt,
        ...(draft ? { draft: true } : {}),
    });
  } catch (e) {
    await cleanupPartialBundle(manifest, shareToken);
    throw e;
  }
  const url = `${getShareBaseUrl()}/t/${shareToken}`;

  console.log(
    `Uploaded ${manifest.ownerUserId}/${manifest.bundleId}/ (${bodyBuf.length} bytes)`
  );

  const payload: UploadResponse = {
    url,
    key: `${userId}/${bundleId}/`,
    createdAt,
    expiresAt,
    expiresInDays: 7,
    ...(draft ? { draft: true } : {}),
  };
  return jsonResponse(200, payload);
}

function getShareBaseUrl(): string {
  return process.env.SHARE_BASE_URL!.replace(/\/+$/, "");
}

function isZipUpload(event: APIGatewayProxyEventV2): boolean {
  const contentType =
    event.headers["content-type"] ?? event.headers["Content-Type"] ?? "";
  const filename = event.queryStringParameters?.filename ?? "";
  return (
    contentType.toLowerCase().includes("zip") ||
    filename.toLowerCase().endsWith(".zip")
  );
}

function isDraftUpload(event: APIGatewayProxyEventV2): boolean {
  const value = event.queryStringParameters?.draft;
  return value === "1" || value?.toLowerCase() === "true";
}

function uploadFilename(event: APIGatewayProxyEventV2): string {
  const filename = event.queryStringParameters?.filename?.trim();
  return filename ? filename : "index.html";
}

function extractRootTitle(
  manifest: ReturnType<typeof buildSingleHtmlBundleManifest>
): string | undefined {
  const root = manifest.files.find((file) => file.relativePath === "index.html");
  if (!root) return undefined;
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(
    root.body.toString("utf8")
  );
  if (!match) return undefined;
  const title = decodeBasicHtmlEntities(match[1])
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return title.length > 0 ? title : undefined;
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function optionalTitle(title: string | undefined): { title?: string } {
  return title ? { title } : {};
}

async function cleanupPartialBundle(
  manifest: ReturnType<typeof buildSingleHtmlBundleManifest>,
  shareToken: string
): Promise<void> {
  try {
    await getObjectStore().deleteObjects(
      manifest.files.map(
        (file) => `${manifest.ownerUserId}/${manifest.bundleId}/${file.relativePath}`
      )
    );
  } catch (cleanupError) {
    console.warn("Failed to clean up partial bundle upload", cleanupError);
  }

  try {
    await deleteShareRecord(shareToken);
  } catch (cleanupError) {
    console.warn("Failed to clean up partial bundle token", cleanupError);
  }
}
