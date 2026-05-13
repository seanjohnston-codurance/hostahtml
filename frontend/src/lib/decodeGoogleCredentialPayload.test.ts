import { describe, it, expect } from "vitest";
import { decodeGoogleCredentialPayload } from "./decodeGoogleCredentialPayload.js";

function b64urlFromJson(obj: object): string {
  const utf8 = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  utf8.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("decodeGoogleCredentialPayload", () => {
  it("returns parsed payload for valid base64url segment", () => {
    const payload = { email: "user@example.com", sub: "abc" };
    const credential = `header.${b64urlFromJson(payload)}.sig`;
    expect(decodeGoogleCredentialPayload(credential)).toEqual(payload);
  });

  it("decodes base64url payloads with omitted padding", () => {
    const payloads = [
      { email: "a@codurance.com" },
      { email: "ab@codurance.com" },
      { email: "abc@codurance.com" },
    ];

    for (const payload of payloads) {
      const credential = `header.${b64urlFromJson(payload)}.sig`;
      expect(decodeGoogleCredentialPayload(credential)).toEqual(payload);
    }
  });

  it("returns null on malformed credential", () => {
    expect(decodeGoogleCredentialPayload("not-a-jwt")).toBeNull();
    expect(decodeGoogleCredentialPayload("a.b!!!.c")).toBeNull();
    expect(decodeGoogleCredentialPayload("a..c")).toBeNull();
  });

  it("returns null when payload JSON is invalid", () => {
    const mid = b64urlFromJson({}).slice(0, -1) + "x";
    expect(decodeGoogleCredentialPayload(`h.${mid}.s`)).toBeNull();
    const invalidJsonMid = btoa("{not-json")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodeGoogleCredentialPayload(`h.${invalidJsonMid}.s`)).toBeNull();
  });
});
