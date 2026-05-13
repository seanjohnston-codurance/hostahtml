import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ErrorResponse } from "@hostahtml/shared";
import { jsonResponse } from "./jsonResponse.js";
import { normalizeShareToken } from "./shareTokenFormat.js";
import { getShareRecord } from "./shareTokens.js";

const s3 = new S3Client({});
const SHORT_PRESIGN_SECONDS = 5 * 60;

export async function handleShareGet(
  token: string | undefined,
  relativePath?: string
): Promise<APIGatewayProxyStructuredResultV2> {
  const normalizedToken = normalizeShareToken(token);
  if (!normalizedToken) {
    return notFound();
  }

  const record = await getShareRecord(normalizedToken);
  const now = Math.floor(Date.now() / 1000);
  if (!record || record.expiresAt <= now || record.revoked === true) {
    return notFound();
  }

  if (record.ownerUserId && record.bundleId) {
    if (relativePath === undefined) {
      return {
        statusCode: 302,
        headers: {
          Location: `/t/${normalizedToken}/`,
          "Cache-Control": "private, no-store",
        },
        body: "",
      };
    }
    const safePath = resolveBundlePath(relativePath);
    if (!safePath) return notFound();

    try {
      const object = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: `${record.ownerUserId}/${record.bundleId}/${safePath}`,
        })
      );
      const bodyBytes = Buffer.from(
        await objectBodyToBytes(object.Body as { transformToByteArray?: () => Promise<Uint8Array> })
      );
      const contentType = object.ContentType ?? "application/octet-stream";
      const text = isTextContentType(contentType);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store",
        },
        isBase64Encoded: !text,
        body: text ? bodyBytes.toString("utf8") : bodyBytes.toString("base64"),
      };
    } catch {
      return notFound();
    }
  }

  if (!record.s3Key) return notFound();

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.BUCKET_NAME!, Key: record.s3Key }),
    { expiresIn: SHORT_PRESIGN_SECONDS }
  );

  return {
    statusCode: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store",
    },
    body: "",
  };
}

function notFound(): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(404, { error: "Not found" } satisfies ErrorResponse);
}

function resolveBundlePath(relativePath: string): string | null {
  const path = relativePath === "" ? "index.html" : relativePath;
  if (path.startsWith("/") || path.includes("\\") || path.includes("//")) return null;
  const resolvedSegments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") return null;
    if (segment === "..") {
      if (resolvedSegments.length === 0) return null;
      resolvedSegments.pop();
      continue;
    }
    resolvedSegments.push(segment);
  }
  if (resolvedSegments.length === 0) return null;
  return resolvedSegments.join("/");
}

async function objectBodyToBytes(body: {
  transformToByteArray?: () => Promise<Uint8Array>;
}): Promise<Uint8Array> {
  if (body.transformToByteArray) return body.transformToByteArray();
  return new Uint8Array();
}

function isTextContentType(contentType: string): boolean {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("svg")
  );
}
