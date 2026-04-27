export const devLoginUsers = {
  alpha: {
    displayName: "Alpha Manager",
    email: "alpha.manager@ftc-fantasy.test",
  },
  beta: {
    displayName: "Beta Manager",
    email: "beta.manager@ftc-fantasy.test",
  },
} as const;

export type DevLoginUserKey = keyof typeof devLoginUsers;

export function isLocalhostHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isDevLoginEnabled(host?: string | null) {
  return process.env.NODE_ENV !== "production" && isLocalhostHost(host);
}

export function isDevLoginUserKey(value: string): value is DevLoginUserKey {
  return value in devLoginUsers;
}
