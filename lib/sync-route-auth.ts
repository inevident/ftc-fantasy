export function parseBearerToken(value?: string | null) {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export function isAuthorizedSyncRequest(
  authorizationHeader: string | null | undefined,
  expectedSecret: string,
) {
  return parseBearerToken(authorizationHeader) === expectedSecret;
}
