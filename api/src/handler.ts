import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { jsonResponse } from "./jsonResponse.js";
import { handleUpload } from "./upload.js";

export const handler = async (
  e: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { method } = e.requestContext.http;
  const path = e.rawPath;
  if (method === "GET" && path === "/")
    return jsonResponse(200, { status: "ok" });
  if (method === "POST" && path === "/upload") return handleUpload(e);
  return jsonResponse(404, { error: "Not found" });
};
