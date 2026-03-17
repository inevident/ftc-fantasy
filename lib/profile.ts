import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfileForUser(supabase: SupabaseClient, user: User) {
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    `Manager ${user.id.slice(0, 6)}`;

  const { error } = await supabase.from("profiles").upsert({
    display_name: displayName,
    email: user.email ?? null,
    id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}
