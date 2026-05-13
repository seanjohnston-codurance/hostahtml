import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { jsonResponse } from "./jsonResponse.js";
import { handleUpload } from "./upload.js";
import { handleShareGet } from "./shareResolve.js";

export const handler = async (
  e: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { method } = e.requestContext.http;
  const path = e.rawPath;
  if (method === "GET" && path === "/")
    return jsonResponse(200, { status: "ok" });
  if (method === "POST" && path === "/upload") return handleUpload(e);
  if (method === "GET" && path.startsWith("/t/")) {
    const { token, relativePath } = parseSharePath(e);
    const options = isDraftPreview(e)
      ? { draftPreview: true as const }
      : undefined;
    return relativePath === undefined
      ? options
        ? handleShareGet(token, undefined, options)
        : handleShareGet(token)
      : options
        ? handleShareGet(token, relativePath, options)
        : handleShareGet(token, relativePath);
  }
  return jsonResponse(404, { error: "Not found" });
};

function parseSharePath(e: APIGatewayProxyEventV2): {
  token: string | undefined;
  relativePath: string | undefined;
} {
  const token = e.pathParameters?.token ?? e.rawPath.slice("/t/".length).split("/")[0];
  const proxy = e.pathParameters?.proxy ?? e.pathParameters?.["proxy+"];
  if (proxy !== undefined) return { token, relativePath: proxy };

  const prefix = `/t/${token}`;
  if (e.rawPath === prefix) return { token, relativePath: undefined };
  if (e.rawPath === `${prefix}/`) return { token, relativePath: "" };
  if (e.rawPath.startsWith(`${prefix}/`)) {
    return { token, relativePath: e.rawPath.slice(prefix.length + 1) };
  }
  return { token, relativePath: undefined };
}

function isDraftPreview(e: APIGatewayProxyEventV2): boolean {
  const value = e.queryStringParameters?.draft;
  return value === "1" || value?.toLowerCase() === "true";
}
