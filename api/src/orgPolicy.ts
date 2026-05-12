/** Google Workspace / email domain for this internal Codurance tool. */
export const CODURANCE_ORG_DOMAIN = "codurance.com";

export function isCoduranceGoogleIdentity(payload: {
  hd?: string;
  email?: string;
}): boolean {
  const org = CODURANCE_ORG_DOMAIN;
  if (payload.hd?.toLowerCase() === org) return true;
  const host = payload.email?.split("@")[1]?.toLowerCase();
  return host === org;
}
