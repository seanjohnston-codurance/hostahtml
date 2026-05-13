import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ErrorResponse } from "@hostahtml/shared";
import { jsonResponse } from "./jsonResponse.js";
import { normalizeShareToken } from "./shareTokenFormat.js";
import { getShareRecord } from "./shareTokens.js";
import { getObjectStore } from "./objectStore.js";

const s3 = new S3Client({});
const SHORT_PRESIGN_SECONDS = 5 * 60;
const DRAFT_WATERMARK_TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="160" viewBox="0 0 256 160">
  <text x="128" y="88" text-anchor="middle" dominant-baseline="middle" transform="rotate(-24 128 80)" font-family="Nunito Sans, Helvetica Neue, Arial, sans-serif" font-size="42" font-weight="900" letter-spacing="5" fill="#e8591a" fill-opacity="0.16">DRAFT</text>
</svg>`;

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
      const object = await getObjectStore().getObject(
        `${record.ownerUserId}/${record.bundleId}/${safePath}`
      );
      const bodyBytes = Buffer.from(object.body);
      const contentType = object.contentType;
      const text = isTextContentType(contentType);
      const body = text ? bodyBytes.toString("utf8") : bodyBytes.toString("base64");

      return {
        statusCode: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store",
        },
        isBase64Encoded: !text,
        body:
          record.draft === true && isHtmlContentType(contentType)
            ? addDraftWatermark(body)
            : body,
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

function isTextContentType(contentType: string): boolean {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("svg")
  );
}

function isHtmlContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/html") ||
    normalized.startsWith("application/xhtml+xml")
  );
}

function addDraftWatermark(html: string): string {
  const tileUrl = `data:image/svg+xml,${encodeURIComponent(DRAFT_WATERMARK_TILE)}`;
  const watermark = `<div class="hostahtml-draft-watermark" aria-hidden="true"></div>
<style>
  .hostahtml-draft-watermark {
    position: fixed;
    inset: -10rem;
    z-index: 2147483647;
    pointer-events: none;
    user-select: none;
    overflow: hidden;
    background-image: url("${tileUrl}");
    background-repeat: repeat;
    background-size: 16rem 10rem;
    background-position: center;
  }
</style>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${watermark}</body>`);
  }
  return `${html}${watermark}`;
}
