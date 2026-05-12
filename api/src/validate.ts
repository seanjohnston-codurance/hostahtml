import type { APIGatewayProxyEventV2 } from "aws-lambda";

export const MAX_UPLOAD_BYTES = 5_000_000;
const HTML_HINTS = /<html|<!doctype|<body/i;

function stripUtf8BomAndLeadingAsciiWhitespace(buf: Buffer): Buffer {
  let i = 0;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    i = 3;
  }
  while (i < buf.length) {
    const b = buf[i];
    if (b === 9 || b === 10 || b === 13 || b === 32) {
      i++;
      continue;
    }
    break;
  }
  return buf.subarray(i);
}

export function validateUpload(body: Buffer): void {
  if (body.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large (${body.length} > ${MAX_UPLOAD_BYTES})`
    );
  }
  const strict =
    process.env.STRICT_HTML_SNIFF === "true" ||
    process.env.STRICT_HTML_SNIFF === "1";
  if (strict) {
    if (body.length === 0 || body[0] !== 0x3c) {
      throw new Error("Body does not look like HTML");
    }
    const head = body.subarray(0, 1024).toString("utf8");
    if (!HTML_HINTS.test(head)) throw new Error("Body does not look like HTML");
    return;
  }
  const sniffSource = stripUtf8BomAndLeadingAsciiWhitespace(body);
  const head = sniffSource.subarray(0, 1024).toString("utf8");
  if (!HTML_HINTS.test(head)) throw new Error("Body does not look like HTML");
}

export function decodeBody(
  body: string | undefined,
  isBase64Encoded: boolean
): Buffer {
  return isBase64Encoded
    ? Buffer.from(body ?? "", "base64")
    : Buffer.from(body ?? "", "utf8");
}

/** Declared body length from API Gateway (case-insensitive). */
export function getContentLength(
  headers: APIGatewayProxyEventV2["headers"] | undefined
): number | undefined {
  if (!headers) return undefined;
  const raw =
    headers["content-length"] ?? headers["Content-Length"] ?? undefined;
  if (raw === undefined) return undefined;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}
