import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ErrorResponse, UploadResponse } from "@hostahtml/shared";
import { verifyGoogleToken } from "./auth.js";
import {
  decodeBody,
  getContentLength,
  MAX_UPLOAD_BYTES,
  validateUpload,
} from "./validate.js";
import { jsonResponse } from "./jsonResponse.js";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
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
    validateUpload(bodyBuf);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith("File too large")) {
      return jsonResponse(413, { error: msg } satisfies ErrorResponse);
    }
    if (msg.includes("does not look like HTML")) {
      return jsonResponse(415, { error: msg } satisfies ErrorResponse);
    }
    throw e;
  }

  const originalName = event.queryStringParameters?.filename ?? "upload.html";
  const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${userId}/${randomUUID()}-${Date.now()}-${safeFilename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bodyBuf,
      ContentType: "text/html; charset=utf-8",
    })
  );

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SEVEN_DAYS }
  );

  console.log(`Uploaded ${key} (${bodyBuf.length} bytes)`);

  const payload: UploadResponse = {
    url,
    key,
    expiresInDays: 7,
  };
  return jsonResponse(200, payload);
}
