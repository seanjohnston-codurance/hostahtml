const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function normalizeShareToken(token: string | undefined): string | null {
  const normalizedToken = token?.toUpperCase();
  return normalizedToken && ULID_PATTERN.test(normalizedToken)
    ? normalizedToken
    : null;
}
