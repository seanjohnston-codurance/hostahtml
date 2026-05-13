import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

import { verifyGoogleToken } from "./auth.js";

function codurancePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: "user-123",
    email_verified: true,
    email: "dev@codurance.com",
    hd: "codurance.com",
    ...overrides,
  };
}

describe("verifyGoogleToken", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    delete process.env.HOSTAHTML_AUTH;
    delete process.env.LOCAL_AUTH_USER_ID;
    mockVerifyIdToken.mockReset();
  });

  it("passes audience and returns sub for Workspace hd match", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => codurancePayload(),
    });
    const sub = await verifyGoogleToken("id-token");
    expect(sub).toBe("user-123");
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: "id-token",
      audience: "test-client-id",
    });
  });

  it("allows @codurance.com email when hd is absent", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () =>
        codurancePayload({ hd: undefined, email: "x@codurance.com" }),
    });
    await expect(verifyGoogleToken("tok")).resolves.toBe("user-123");
  });

  it("throws when payload missing sub", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email_verified: true, hd: "codurance.com" }),
    });
    await expect(verifyGoogleToken("tok")).rejects.toThrow("no sub claim");
  });

  it("throws when email not verified", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () =>
        codurancePayload({ email_verified: false, email: "a@codurance.com" }),
    });
    await expect(verifyGoogleToken("tok")).rejects.toThrow("email not verified");
  });

  it("rejects non-Codurance hosted domain", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () =>
        codurancePayload({
          hd: "evil.com",
          email: "a@evil.com",
        }),
    });
    await expect(verifyGoogleToken("tok")).rejects.toThrow(
      "identity not allowed by org policy"
    );
  });

  it("rejects verified Gmail that is not @codurance.com", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () =>
        codurancePayload({
          hd: undefined,
          email: "someone@gmail.com",
        }),
    });
    await expect(verifyGoogleToken("tok")).rejects.toThrow(
      "identity not allowed by org policy"
    );
  });

  it("accepts the deterministic development token in local auth mode", async () => {
    process.env.HOSTAHTML_AUTH = "local";
    process.env.LOCAL_AUTH_USER_ID = "local-dev";

    await expect(verifyGoogleToken("dev-token")).resolves.toBe("local-dev");
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
