import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
});

const serverOnlyEnvSchema = publicSupabaseEnvSchema.extend({
  FTC_API_TOKEN: z.string().min(1).optional(),
  FTC_API_USERNAME: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SYNC_ROUTE_SECRET: z.string().min(1).optional(),
});

export function getPublicSupabaseEnv() {
  const parsed = publicSupabaseEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    return null;
  }

  return {
    anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function getSupabaseServiceRoleEnv() {
  const parsed = serverOnlyEnvSchema.safeParse(process.env);

  if (!parsed.success || !parsed.data.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return {
    serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function getFtcApiEnv() {
  const parsed = serverOnlyEnvSchema.safeParse(process.env);

  if (!parsed.success || !parsed.data.FTC_API_USERNAME || !parsed.data.FTC_API_TOKEN) {
    return null;
  }

  return {
    token: parsed.data.FTC_API_TOKEN,
    username: parsed.data.FTC_API_USERNAME,
  };
}

export function getSyncRouteSecretEnv() {
  const parsed = serverOnlyEnvSchema.safeParse(process.env);

  if (!parsed.success || !parsed.data.SYNC_ROUTE_SECRET) {
    return null;
  }

  return {
    secret: parsed.data.SYNC_ROUTE_SECRET,
  };
}

export function hasSupabaseConfig() {
  return getPublicSupabaseEnv() !== null;
}

export function hasFtcApiConfig() {
  return getFtcApiEnv() !== null;
}

export function getSetupChecklist() {
  return [
    !getPublicSupabaseEnv() && "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
    !getSupabaseServiceRoleEnv() && "Set SUPABASE_SERVICE_ROLE_KEY to enable persistent sync jobs.",
    !getFtcApiEnv() && "Set FTC_API_USERNAME and FTC_API_TOKEN to enable live Worlds sync.",
    !getSyncRouteSecretEnv() && "Set SYNC_ROUTE_SECRET to protect the sync endpoints.",
  ].filter(Boolean) as string[];
}
