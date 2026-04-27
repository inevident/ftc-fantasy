import { NextResponse } from "next/server";

import { buildSignInUrl, resolveRequestOrigin } from "@/lib/auth/oauth";
import { ensureProfileForUser } from "@/lib/profile";
import { normalizeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = normalizeNextPath(url.searchParams.get("next"));
  const origin = resolveRequestOrigin(request.headers, request.url);
  const providerError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(buildSignInUrl(request.headers, request.url, next, providerError));
  }

  const supabase = await createClient();
  if (!supabase || !code) {
    return NextResponse.redirect(buildSignInUrl(request.headers, request.url, next, "Unable to finish sign-in"));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(buildSignInUrl(request.headers, request.url, next, error.message));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureProfileForUser(supabase, user);
    } catch (profileError) {
      const message =
        profileError instanceof Error ? profileError.message : "Unable to finish sign-in";
      return NextResponse.redirect(buildSignInUrl(request.headers, request.url, next, message));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
