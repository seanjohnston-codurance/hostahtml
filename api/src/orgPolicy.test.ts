import { describe, it, expect } from "vitest";
import { isCoduranceGoogleIdentity } from "./orgPolicy.js";

describe("isCoduranceGoogleIdentity", () => {
  it("matches hd claim", () => {
    expect(
      isCoduranceGoogleIdentity({ hd: "codurance.com", email: "x@other.com" })
    ).toBe(true);
    expect(
      isCoduranceGoogleIdentity({ hd: "Codurance.COM", email: "x@other.com" })
    ).toBe(true);
  });

  it("matches email host when hd missing", () => {
    expect(
      isCoduranceGoogleIdentity({ email: "a@codurance.com" })
    ).toBe(true);
  });

  it("rejects other and malformed domains", () => {
    for (const payload of [
      { hd: "google.com" },
      { hd: "sub.codurance.com" },
      { email: "a@gmail.com" },
      { email: "a@sub.codurance.com" },
      { email: "a@codurance.com.evil" },
      { email: "a@codurance.com@evil.example" },
    ]) {
      expect(isCoduranceGoogleIdentity(payload)).toBe(false);
    }
  });
});
