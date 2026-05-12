import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME!;
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
    const originalName = event.queryStringParameters?.filename ?? "upload.html";
    const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}-${safeFilename}`;

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

  return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
};

function ok(body: object): APIGatewayProxyResultV2 {
  return { statusCode: 200, body: JSON.stringify(body) };
}
