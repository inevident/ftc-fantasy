import { NextResponse } from "next/server";

import { ensureProfileForUser } from "@/lib/profile";
import { normalizeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = normalizeNextPath(url.searchParams.get("next"));

  const supabase = await createClient();
  if (!supabase || !code) {
    return NextResponse.redirect(new URL(`/sign-in?error=Unable+to+finish+sign-in`, url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfileForUser(supabase, user);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

