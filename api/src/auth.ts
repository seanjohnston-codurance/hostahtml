import { OAuth2Client } from "google-auth-library";
import { isCoduranceGoogleIdentity } from "./orgPolicy.js";

const client = new OAuth2Client();

function isEmailVerified(payload: {
  email_verified?: boolean | string;
}): boolean {
  const v = payload.email_verified;
  return v === true || v === "true";
}

export async function verifyGoogleToken(token: string): Promise<string> {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw new Error("GOOGLE_CLIENT_ID not set");
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("no sub claim");
  if (!isEmailVerified(payload)) throw new Error("email not verified");
  if (!isCoduranceGoogleIdentity(payload)) {
    throw new Error("identity not allowed by org policy");
  }

  return payload.sub;
}
