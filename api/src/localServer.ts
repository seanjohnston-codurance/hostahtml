import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { handler } from "./handler.js";

export function createLocalApiServer() {
  const origin = process.env.HOSTAHTML_DEV_ORIGIN ?? "http://localhost:5173";
  process.env.HOSTAHTML_STORAGE ??= "filesystem";
  process.env.HOSTAHTML_AUTH ??= "local";
  process.env.LOCAL_AUTH_USER_ID ??= "local-user";

  return createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      writeCorsPreflight(res, origin);
      return;
    }

    try {
      const event = await toApiGatewayEvent(req);
      const result = await handler(event);
      writeLambdaResult(res, result, origin);
    } catch (error) {
      console.error("Local API request failed", error);
      writeLambdaResult(
        res,
        {
          statusCode: 500,
          body: JSON.stringify({ error: "Internal server error" }),
          headers: { "content-type": "application/json; charset=utf-8" },
        },
        origin
      );
    }
  });
}

export function startLocalApiServer(): void {
  const port = Number(process.env.PORT ?? "9999");
  const host = process.env.HOST ?? "127.0.0.1";
  process.env.SHARE_BASE_URL ??= `http://${host}:${port}`;

  const server = createLocalApiServer();
  server.listen(port, host, () => {
    console.log(`HostaHTML local API listening on http://${host}:${port}`);
    console.log("Use Authorization: Bearer dev-token for local uploads.");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLocalApiServer();
}

async function toApiGatewayEvent(
  req: IncomingMessage
): Promise<APIGatewayProxyEventV2> {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`
  );
  const body = await readRequestBody(req);
  const isText = isTextRequest(req.headers["content-type"]);

  return {
    version: "2.0",
    routeKey: `${req.method ?? "GET"} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers: headersToRecord(req),
    queryStringParameters: queryParamsToRecord(url),
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: req.headers.host ?? "localhost",
      domainPrefix: "local",
      http: {
        method: req.method ?? "GET",
        path: url.pathname,
        protocol: `HTTP/${req.httpVersion}`,
        sourceIp: req.socket.remoteAddress ?? "127.0.0.1",
        userAgent: req.headers["user-agent"] ?? "local",
      },
      requestId: randomUUID(),
      routeKey: `${req.method ?? "GET"} ${url.pathname}`,
      stage: "$default",
      time: new Date().toUTCString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: !isText,
    body:
      body.length === 0
        ? undefined
        : isText
          ? body.toString("utf8")
          : body.toString("base64"),
  };
}

function writeLambdaResult(
  res: ServerResponse,
  result: APIGatewayProxyStructuredResultV2,
  origin: string
): void {
  res.statusCode = result.statusCode ?? 200;
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    if (value !== undefined) res.setHeader(key, String(value));
  }
  setCorsHeaders(res, origin);

  if (!result.body) {
    res.end();
    return;
  }

  res.end(
    result.isBase64Encoded
      ? Buffer.from(result.body, "base64")
      : Buffer.from(result.body, "utf8")
  );
}

function writeCorsPreflight(res: ServerResponse, origin: string): void {
  res.statusCode = 204;
  setCorsHeaders(res, origin);
  res.end();
}

function setCorsHeaders(res: ServerResponse, origin: string): void {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
}

function headersToRecord(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers[key] = value.join(",");
    else if (value !== undefined) headers[key] = value;
  }
  return headers;
}

function queryParamsToRecord(url: URL): Record<string, string> | undefined {
  const entries = [...url.searchParams.entries()];
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function isTextRequest(contentType: string | string[] | undefined): boolean {
  const normalized = Array.isArray(contentType)
    ? contentType.join(",").toLowerCase()
    : (contentType ?? "").toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("javascript") ||
    normalized.includes("svg")
  );
}
