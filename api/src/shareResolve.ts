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
  const watermark = `<div class="hostahtml-draft-watermark" aria-hidden="true">
  <span>DRAFT</span>
  <strong>NOT FOR CIRCULATION</strong>
</div>
<style>
  .hostahtml-draft-watermark {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    pointer-events: none;
    user-select: none;
    font-family: "Nunito Sans", "Helvetica Neue", Arial, sans-serif;
    text-align: center;
    color: #ffffff;
    opacity: 0.92;
  }
  .hostahtml-draft-watermark::before {
    content: "";
    position: absolute;
    inset: -20vmax;
    background:
      repeating-linear-gradient(
        -35deg,
        transparent 0 9rem,
        rgba(232, 89, 26, 0.18) 9rem 12rem
      ),
      rgba(26, 37, 53, 0.18);
  }
  .hostahtml-draft-watermark span,
  .hostahtml-draft-watermark strong {
    position: absolute;
    transform: rotate(-24deg);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-shadow:
      0 0 2px #1a2535,
      0 0 18px rgba(26, 37, 53, 0.65);
  }
  .hostahtml-draft-watermark span {
    font-size: clamp(4rem, 18vw, 13rem);
    font-weight: 900;
    -webkit-text-stroke: 0.05em #e8591a;
  }
  .hostahtml-draft-watermark strong {
    margin-top: clamp(6rem, 20vw, 15rem);
    padding: 0.45rem 1rem;
    border: 0.16em solid #e8591a;
    border-radius: 999px;
    background: rgba(26, 37, 53, 0.88);
    font-size: clamp(1rem, 3vw, 2.2rem);
    font-weight: 900;
  }
</style>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${watermark}</body>`);
  }
  return `${html}${watermark}`;
}
