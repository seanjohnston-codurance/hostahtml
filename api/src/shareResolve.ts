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

function isHtmlContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/html") ||
    normalized.startsWith("application/xhtml+xml")
  );
}

function addDraftWatermark(html: string): string {
  const tiles = Array.from({ length: 48 }, () => "<span>DRAFT</span>").join("\n  ");
  const watermark = `<div class="hostahtml-draft-watermark" aria-hidden="true">
  ${tiles}
</div>
<style>
  .hostahtml-draft-watermark {
    position: fixed;
    inset: -10rem;
    z-index: 2147483647;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    grid-auto-rows: 10rem;
    place-items: center;
    pointer-events: none;
    user-select: none;
    overflow: hidden;
    font-family: "Nunito Sans", "Helvetica Neue", Arial, sans-serif;
    text-align: center;
    color: rgba(232, 89, 26, 0.16);
  }
  .hostahtml-draft-watermark span {
    transform: rotate(-24deg);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: clamp(1.75rem, 4vw, 3.5rem);
    font-weight: 900;
  }
</style>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${watermark}</body>`);
  }
  return `${html}${watermark}`;
}
