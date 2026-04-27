import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  devLoginUsers,
  isDevLoginEnabled,
  isDevLoginUserKey,
} from "@/lib/auth/dev-login";
import { ensureProfileForUser } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

async function ensureDevUser(email: string, displayName: string, ephemeralCredential: string) {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase service-role key is required for dev login.");
  }

  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === email);

  if (existingUser) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      password: ephemeralCredential,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: ephemeralCredential,
    user_metadata: {
      display_name: displayName,
    },
  });

  if (createError) {
    throw createError;
  }
}

export async function GET(request: Request) {
  if (!isDevLoginEnabled(request.headers.get("host"))) {
    return NextResponse.json({ error: "Dev login is disabled." }, { status: 404 });
  }

  const url = new URL(request.url);
  const userKey = String(url.searchParams.get("user") ?? "alpha").toLowerCase();
  const next = normalizeNextPath(url.searchParams.get("next") ?? "/dashboard");

  if (!isDevLoginUserKey(userKey)) {
    return NextResponse.json(
      {
        availableUsers: Object.keys(devLoginUsers),
        error: "Unknown dev user.",
      },
      { status: 400 },
    );
  }

  const devUser = devLoginUsers[userKey];
  const ephemeralCredential = `dev-${randomUUID()}`;
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase public keys are missing." }, { status: 500 });
  }

  try {
    await ensureDevUser(devUser.email, devUser.displayName, ephemeralCredential);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: devUser.email,
      password: ephemeralCredential,
    });

    if (error || !data.user) {
      throw error ?? new Error("Unable to sign in dev user.");
    }

    await ensureProfileForUser(supabase, data.user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete dev login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
