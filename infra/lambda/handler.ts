import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  if (method === "GET" && path === "/") {
    return ok({ status: "ok" });
  }

  if (method === "POST" && path === "/upload") {
    const authHeader = event.headers["authorization"] ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return err(401, "Missing token");

    let userId: string;
    try {
      userId = await verifyGoogleToken(token);
    } catch (e) {
      return err(401, "Invalid token");
    }

    const originalName = event.queryStringParameters?.filename ?? "upload.html";
    const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${userId}/${Date.now()}-${safeFilename}`;

    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64")
      : Buffer.from(event.body ?? "", "utf-8");

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: "text/html; charset=utf-8",
      })
    );

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: SEVEN_DAYS }
    );

    console.log(`Uploaded ${key} (${body.length} bytes)`);
    return ok({ url, key, expiresInDays: 7 });
  }

  return err(404, "Not found");
};

async function verifyGoogleToken(token: string): Promise<string> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );
  if (!res.ok) throw new Error("tokeninfo failed");
  const info = (await res.json()) as { aud?: string; sub?: string };
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error("wrong audience");
  return info.sub!;
}

function ok(body: object): APIGatewayProxyResultV2 {
  return { statusCode: 200, body: JSON.stringify(body) };
}

function err(status: number, message: string): APIGatewayProxyResultV2 {
  return { statusCode: status, body: JSON.stringify({ error: message }) };
}
