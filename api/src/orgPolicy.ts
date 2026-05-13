/** Google Workspace / email domain for this internal Codurance tool. */
export const CODURANCE_ORG_DOMAIN = "codurance.com";

export function isCoduranceGoogleIdentity(payload: {
  hd?: string;
  email?: string;
}): boolean {
  const org = CODURANCE_ORG_DOMAIN;
  if (payload.hd?.toLowerCase() === org) return true;
  const parts = payload.email?.split("@");
  const host = parts?.length === 2 ? parts[1]?.toLowerCase() : undefined;
  return host === org;
}
