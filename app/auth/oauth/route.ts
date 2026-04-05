import { NextResponse } from "next/server";

import { buildAuthCallbackUrl, buildSignInUrl, isOAuthProvider } from "@/lib/auth/oauth";
import { normalizeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

function redirectToSignIn(request: Request, message: string, next: string) {
  return NextResponse.redirect(buildSignInUrl(request.headers, request.url, next, message));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = String(url.searchParams.get("provider") ?? "").trim().toLowerCase();
  const next = normalizeNextPath(url.searchParams.get("next"));

  if (!isOAuthProvider(provider)) {
    return redirectToSignIn(request, "Unsupported OAuth provider.", next);
  }

  const supabase = await createClient();
  if (!supabase) {
    return redirectToSignIn(request, "Supabase is not configured.", next);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: buildAuthCallbackUrl(request.headers, request.url, next),
      skipBrowserRedirect: true,
    },
    provider,
  });

  if (error || !data?.url) {
    return redirectToSignIn(request, error?.message ?? "Unable to start OAuth sign-in.", next);
  }

  return NextResponse.redirect(data.url);
}
