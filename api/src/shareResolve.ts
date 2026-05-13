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
  token: string | undefined
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
