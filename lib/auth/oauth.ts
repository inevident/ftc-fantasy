import { getAppOriginEnv } from "@/lib/env";

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

export function resolveRequestOrigin(_headers: HeaderReader, requestUrl: string) {
  const appOrigin = getAppOriginEnv();
  if (appOrigin) {
    return appOrigin;
  }

  const fallbackUrl = new URL(requestUrl);
  return fallbackUrl.origin;
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
