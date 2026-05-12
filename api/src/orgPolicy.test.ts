import { describe, it, expect } from "vitest";
import {
  CODURANCE_ORG_DOMAIN,
  isCoduranceGoogleIdentity,
} from "./orgPolicy.js";

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

  it("rejects other domains", () => {
    expect(isCoduranceGoogleIdentity({ hd: "google.com" })).toBe(false);
    expect(
      isCoduranceGoogleIdentity({ email: "a@gmail.com" })
    ).toBe(false);
  });

  it("exports expected org constant", () => {
    expect(CODURANCE_ORG_DOMAIN).toBe("codurance.com");
  });
});
