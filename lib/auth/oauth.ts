export const oauthProviders = [
  {
    id: "google",
    label: "Continue with Google",
    shortLabel: "Google",
  },
] as const;

export type OAuthProvider = (typeof oauthProviders)[number]["id"];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return oauthProviders.some((provider) => provider.id === value);
}

type HeaderReader = Pick<Headers, "get">;

function getForwardedHeaderValue(headers: HeaderReader, name: string) {
  const value = headers.get(name);

  if (!value) {
    return null;
  }

  const firstValue = value.split(",")[0]?.trim();
  return firstValue || null;
}

export function resolveRequestOrigin(headers: HeaderReader, requestUrl: string) {
  const fallbackUrl = new URL(requestUrl);
  const forwardedHost = getForwardedHeaderValue(headers, "x-forwarded-host");

  if (!forwardedHost) {
    return fallbackUrl.origin;
  }

  const forwardedProto =
    getForwardedHeaderValue(headers, "x-forwarded-proto") ??
    fallbackUrl.protocol.replace(/:$/, "");

  return `${forwardedProto}://${forwardedHost}`;
}

export function buildAuthCallbackUrl(headers: HeaderReader, requestUrl: string, next: string) {
  const callbackUrl = new URL("/auth/callback", resolveRequestOrigin(headers, requestUrl));
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export function buildSignInUrl(
  headers: HeaderReader,
  requestUrl: string,
  next: string,
  error?: string,
) {
  const signInUrl = new URL("/sign-in", resolveRequestOrigin(headers, requestUrl));
  signInUrl.searchParams.set("next", next);

  if (error) {
    signInUrl.searchParams.set("error", error);
  }

  return signInUrl;
}
