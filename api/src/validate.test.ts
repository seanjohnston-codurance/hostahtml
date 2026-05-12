import { afterEach, describe, it, expect } from "vitest";
import { decodeBody, getContentLength, validateUpload } from "./validate.js";

describe("validateUpload", () => {
  afterEach(() => {
    delete process.env.STRICT_HTML_SNIFF;
  });
  it("accepts <!doctype html> buffer", () => {
    expect(() =>
      validateUpload(Buffer.from("<!doctype html><html></html>", "utf8"))
    ).not.toThrow();
  });

  it("rejects empty buffer", () => {
    expect(() => validateUpload(Buffer.alloc(0))).toThrow(
      "Body does not look like HTML"
    );
  });

  it("rejects 6 MB decoded buffer", () => {
    const buf = Buffer.alloc(6_000_000, 97);
    buf.write("<!doctype html>", 0);
    expect(() => validateUpload(buf)).toThrow("File too large");
  });

  it("rejects binary blob", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(() => validateUpload(buf)).toThrow("Body does not look like HTML");
  });

  it("accepts UTF-8 BOM and leading whitespace before HTML hint", () => {
    const buf = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from("  \n\t"),
      Buffer.from("<!doctype html><html></html>", "utf8"),
    ]);
    expect(() => validateUpload(buf)).not.toThrow();
  });

  it("strict sniff rejects BOM-prefixed HTML", () => {
    process.env.STRICT_HTML_SNIFF = "true";
    const buf = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from("<html><body>x</body></html>", "utf8"),
    ]);
    expect(() => validateUpload(buf)).toThrow("Body does not look like HTML");
  });
});

describe("getContentLength", () => {
  it("reads Content-Length case-insensitively", () => {
    expect(
      getContentLength({ "Content-Length": "42", other: "x" })
    ).toBe(42);
    expect(getContentLength({ "content-length": "99" })).toBe(99);
  });

  it("returns undefined when absent", () => {
    expect(getContentLength({})).toBeUndefined();
    expect(getContentLength(undefined)).toBeUndefined();
  });
});

describe("decodeBody", () => {
  it("decodes plain UTF-8 before validation accepts HTML", () => {
    const html = "<html><body>x</body></html>";
    const buf = decodeBody(html, false);
    expect(() => validateUpload(buf)).not.toThrow();
  });

  it("decodes base64 API Gateway body before validation", () => {
    const html = "<html><body>x</body></html>";
    const b64 = Buffer.from(html, "utf8").toString("base64");
    const buf = decodeBody(b64, true);
    expect(() => validateUpload(buf)).not.toThrow();
  });
});
