import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = {
  body: Uint8Array;
  contentType: string;
};

export type ObjectStore = {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void>;
  getObject(key: string): Promise<StoredObject>;
  deleteObjects(keys: string[]): Promise<void>;
};

let objectStore: ObjectStore | undefined;

export function getObjectStore(): ObjectStore {
  objectStore ??=
    process.env.HOSTAHTML_STORAGE === "filesystem"
      ? createFilesystemObjectStore(localDataRoot())
      : createAwsObjectStore();
  return objectStore;
}

export function setObjectStoreForTest(store: ObjectStore | undefined): void {
  objectStore = store;
}

export function createFilesystemObjectStore(root: string): ObjectStore {
  const objectRoot = path.resolve(root, "objects");
  return {
    async putObject({ key, body, contentType }) {
      const filePath = safeObjectPath(objectRoot, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
      await writeFile(
        metadataPath(filePath),
        `${JSON.stringify({ contentType }, null, 2)}\n`
      );
    },
    async getObject(key) {
      const filePath = safeObjectPath(objectRoot, key);
      const body = await readFile(filePath);
      const metadata = await readObjectMetadata(filePath);
      return {
        body,
        contentType: metadata.contentType ?? "application/octet-stream",
      };
    },
    async deleteObjects(keys) {
      await Promise.all(
        keys.map(async (key) => {
          const filePath = safeObjectPath(objectRoot, key);
          await rm(filePath, { force: true });
          await rm(metadataPath(filePath), { force: true });
        })
      );
    },
  };
}

function createAwsObjectStore(): ObjectStore {
  const s3 = new S3Client({});
  return {
    async putObject({ key, body, contentType }) {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    },
    async getObject(key) {
      const object = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME!,
          Key: key,
        })
      );
      return {
        body: await objectBodyToBytes(
          object.Body as { transformToByteArray?: () => Promise<Uint8Array> }
        ),
        contentType: object.ContentType ?? "application/octet-stream",
      };
    },
    async deleteObjects(keys) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.BUCKET_NAME!,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        })
      );
    },
  };
}

async function objectBodyToBytes(body: {
  transformToByteArray?: () => Promise<Uint8Array>;
}): Promise<Uint8Array> {
  if (body.transformToByteArray) return body.transformToByteArray();
  return new Uint8Array();
}

function localDataRoot(): string {
  return process.env.HOSTAHTML_LOCAL_DATA_DIR ?? ".hostahtml-local";
}

function safeObjectPath(root: string, key: string): string {
  if (
    key.length === 0 ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe object key: ${key}`);
  }

  const resolved = path.resolve(root, ...key.split("/"));
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe object key: ${key}`);
  }
  return resolved;
}

function metadataPath(filePath: string): string {
  return `${filePath}.metadata.json`;
}

async function readObjectMetadata(
  filePath: string
): Promise<{ contentType?: string }> {
  try {
    return JSON.parse(await readFile(metadataPath(filePath), "utf8")) as {
      contentType?: string;
    };
  } catch {
    return {};
  }
}
