export type GoogleCredentialJwtPayload = {
  email?: string;
  exp?: number;
};

/**
 * Decodes the JWT payload segment of a Google GSI `credential` string (base64url).
 * Returns null on any failure — safe for use inside sign-in callbacks.
 */
export function decodeGoogleCredentialPayload(
  credential: string
): GoogleCredentialJwtPayload | null {
  try {
    const parts = credential.split(".");
    if (parts.length < 2) return null;
    const segment = parts[1];
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
    const json = atob(padded);
    return JSON.parse(json) as GoogleCredentialJwtPayload;
  } catch {
    return null;
  }
}
