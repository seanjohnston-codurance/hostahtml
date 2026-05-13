import { unzipSync } from "fflate";
import { validateUpload } from "./validate.js";

export const MAX_BUNDLE_FILES = 100;
export const MAX_BUNDLE_UNCOMPRESSED_BYTES = 20_000_000;
export const MAX_BUNDLE_FILE_BYTES = 5_000_000;

export type BundleFile = {
  relativePath: string;
  sizeBytes: number;
  contentType: string;
  body: Buffer;
};

export type BundleManifest = {
  ownerUserId: string;
  bundleId: string;
  files: BundleFile[];
};

const IGNORED_PATHS = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/;
const ROOT_RELATIVE_REFERENCE =
  /\b(?:src|href)\s*=\s*["']\/(?!\/)|url\(\s*["']?\/(?!\/)|@import\s+["']\/(?!\/)|\bimport\s+(?:[^"']+\s+from\s+)?["']\/(?!\/)/i;
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".json",
  ".svg",
  ".map",
]);

export function buildSingleHtmlBundleManifest(
  ownerUserId: string,
  bundleId: string,
  body: Buffer
): BundleManifest {
  validateUpload(body);
  scanEscapingReferences("index.html", body);
  return {
    ownerUserId,
    bundleId,
    files: [
      {
        relativePath: "index.html",
        sizeBytes: body.length,
        contentType: "text/html; charset=utf-8",
        body,
      },
    ],
  };
}

export function buildZipBundleManifest(
  ownerUserId: string,
  bundleId: string,
  body: Buffer
): BundleManifest {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(body));
  } catch {
    throw new Error("Bundle is not a valid zip archive");
  }
  const files: BundleFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  for (const [rawPath, entryBody] of Object.entries(entries)) {
    if (isDirectoryPath(rawPath) || shouldIgnorePath(rawPath)) continue;

    const relativePath = normalizeBundlePath(rawPath);
    if (seen.has(relativePath)) {
      throw new Error(`Duplicate bundle path: ${relativePath}`);
    }
    seen.add(relativePath);

    const fileBody = Buffer.from(entryBody);
    if (fileBody.length > MAX_BUNDLE_FILE_BYTES) {
      throw new Error(`Bundle file too large: ${relativePath}`);
    }
    totalBytes += fileBody.length;
    if (totalBytes > MAX_BUNDLE_UNCOMPRESSED_BYTES) {
      throw new Error("Bundle too large after decompression");
    }

    if (relativePath === "index.html") validateUpload(fileBody);
    if (isTextLikePath(relativePath)) scanEscapingReferences(relativePath, fileBody);

    files.push({
      relativePath,
      sizeBytes: fileBody.length,
      contentType: contentTypeForPath(relativePath),
      body: fileBody,
    });
  }

  if (files.length === 0) throw new Error("Bundle is empty");
  if (files.length > MAX_BUNDLE_FILES) {
    throw new Error(`Bundle has too many files (${files.length} > ${MAX_BUNDLE_FILES})`);
  }
  if (!files.some((file) => file.relativePath === "index.html")) {
    throw new Error("Bundle must contain index.html at the zip root");
  }

  return { ownerUserId, bundleId, files };
}

export function normalizeBundlePath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.includes("//")
  ) {
    throw new Error(`Unsafe bundle path: ${rawPath}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Unsafe bundle path: ${rawPath}`);
  }

  return normalized;
}

export function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) {
    return "text/javascript; charset=utf-8";
  }
  if (lower.endsWith(".json") || lower.endsWith(".map")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  return "application/octet-stream";
}

function scanEscapingReferences(path: string, body: Buffer): void {
  const text = body.toString("utf8");
  if (ROOT_RELATIVE_REFERENCE.test(text)) {
    throw new Error(`Bundle file ${path} uses a root-relative reference`);
  }
}

function shouldIgnorePath(rawPath: string): boolean {
  return IGNORED_PATHS.test(rawPath.replace(/\\/g, "/"));
}

function isDirectoryPath(rawPath: string): boolean {
  return rawPath.endsWith("/") || rawPath.endsWith("\\");
}

function isTextLikePath(path: string): boolean {
  const lower = path.toLowerCase();
  for (const extension of TEXT_EXTENSIONS) {
    if (lower.endsWith(extension)) return true;
  }
  return false;
}
