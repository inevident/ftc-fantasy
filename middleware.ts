import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // If user is signed in and on the landing page, redirect to dashboard
  if (request.nextUrl.pathname === "/") {
    const sessionCookie = request.cookies.getAll().find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
