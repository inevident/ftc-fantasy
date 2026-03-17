import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getSupabaseServiceRoleEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

