import { timingSafeEqual } from "node:crypto";

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
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedSecret);

  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}
