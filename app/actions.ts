"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { magicLinkRedirectPath, seasonConfig } from "@/lib/constants";
import { getSeasonPool } from "@/lib/data";
import { validateEntrySelection } from "@/lib/fantasy/divisions";
import { ensureProfileForUser } from "@/lib/profile";
import type { ActionState } from "@/lib/types";
import { buildInviteCode, normalizeInviteCode, normalizeNextPath, uniqueNumbers } from "@/lib/utils";
import { resolveRequestOrigin } from "@/lib/auth/oauth";
import { createClient } from "@/utils/supabase/server";

const idleActionState: ActionState = { status: "idle" };

async function getAuthenticatedUser() {
  const supabase = await createClient();

  if (!supabase) {
    return { error: "Supabase is not configured.", supabase: null, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in required.", supabase, user: null };
  }

  await ensureProfileForUser(supabase, user);

  return { error: null, supabase, user };
}

export async function requestMagicLinkAction(
  previousState: ActionState = idleActionState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = normalizeNextPath(String(formData.get("next") ?? magicLinkRedirectPath));

  if (!email) {
    return {
      message: "Enter the email address you want to use for league play.",
      status: "error",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      message: "Supabase public keys are missing.",
      status: "error",
    };
  }

  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("host") ?? "localhost:3000";
  const requestProto = requestHost.startsWith("localhost") ? "http" : "https";
  const origin = resolveRequestOrigin(requestHeaders, `${requestProto}://${requestHost}`);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    return { message: error.message, status: "error" };
  }

  return {
    message: "Magic link sent. Open the email on the same device to finish sign-in.",
    status: "success",
  };
}

export async function signOutAction() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function createLeagueAction(
  previousState: ActionState = idleActionState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) {
    return { message: "League names need at least 3 characters.", status: "error" };
  }

  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { message: auth.error ?? "Sign in required.", status: "error" };
  }

  let inviteCode = buildInviteCode();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: league, error } = await auth.supabase
      .from("leagues")
      .insert({
        created_by: auth.user.id,
        invite_code: inviteCode,
        is_private: true,
        name,
        season_id: seasonConfig.id,
      })
      .select("id, invite_code")
      .single();

    if (error && error.code === "23505") {
      inviteCode = buildInviteCode();
      continue;
    }

    if (error) {
      return { message: error.message, status: "error" };
    }

    const { error: memberError } = await auth.supabase.from("league_members").insert({
      joined_at: new Date().toISOString(),
      league_id: league.id,
      role: "owner",
      user_id: auth.user.id,
    });

    if (memberError) {
      return { message: memberError.message, status: "error" };
    }

    revalidatePath("/dashboard");
    redirect(`/leagues/${league.invite_code}`);
  }

  return { message: "Unable to allocate a unique invite code. Try again.", status: "error" };
}

export async function joinLeagueAction(
  previousState: ActionState = idleActionState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const inviteCode = normalizeInviteCode(String(formData.get("inviteCode") ?? ""));

  if (!inviteCode) {
    return { message: "Enter an invite code.", status: "error" };
  }

  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { message: auth.error ?? "Sign in required.", status: "error" };
  }

  const { data: league, error } = await auth.supabase
    .rpc("join_league_with_invite", { target_invite_code: inviteCode })
    .maybeSingle();
  const joinedLeague = league as { invite_code: string } | null;

  if (error || !joinedLeague) {
    return { message: error?.message ?? "Invite code not found.", status: "error" };
  }

  revalidatePath("/dashboard");
  redirect(`/leagues/${joinedLeague.invite_code}`);
}

export async function joinLeagueDirectAction(formData: FormData) {
  const inviteCode = normalizeInviteCode(String(formData.get("inviteCode") ?? ""));
  const result = await joinLeagueAction(idleActionState, formData);

  if (result.status === "error") {
    redirect(`/leagues/${inviteCode}?error=${encodeURIComponent(result.message ?? "Unable to join league.")}`);
  }
}

export async function createOrOpenEntryAction(
  previousState: ActionState = idleActionState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  if (!leagueId) {
    return { message: "League id is missing.", status: "error" };
  }

  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { message: auth.error ?? "Sign in required.", status: "error" };
  }

  const seasonPool = await getSeasonPool();
  if (seasonPool.season.entriesLockedAt) {
    return {
      message: "Entries are locked because Worlds qualification matches have started.",
      status: "error",
    };
  }

  const { data: existingEntry, error: existingError } = await auth.supabase
    .from("entries")
    .select("id, locked_at")
    .eq("league_id", leagueId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingError) {
    return { message: existingError.message, status: "error" };
  }

  if (existingEntry?.id) {
    redirect(`/entries/${existingEntry.id}`);
  }

  const defaultName =
    `${auth.user.user_metadata?.display_name ?? auth.user.email?.split("@")[0] ?? "Manager"}'s roster`;

  const { data: createdEntry, error: createError } = await auth.supabase
    .from("entries")
    .insert({
      champion_pick_team_number: null,
      invalid_reason: "Finish the draft before saving.",
      is_valid: false,
      league_id: leagueId,
      name: defaultName,
      saved_at: new Date().toISOString(),
      season_id: seasonConfig.id,
      user_id: auth.user.id,
    })
    .select("id")
    .single();

  if (createError) {
    return { message: createError.message, status: "error" };
  }

  revalidatePath("/dashboard");
  redirect(`/entries/${createdEntry.id}`);
}

export async function createOrOpenEntryDirectAction(formData: FormData) {
  const leagueCode = normalizeInviteCode(String(formData.get("leagueCode") ?? ""));
  const result = await createOrOpenEntryAction(idleActionState, formData);

  if (result.status === "error") {
    redirect(`/leagues/${leagueCode}?error=${encodeURIComponent(result.message ?? "Unable to open entry.")}`);
  }
}

export async function saveEntryAction(
  previousState: ActionState = idleActionState,
  formData: FormData,
): Promise<ActionState> {
  void previousState;
  const entryId = String(formData.get("entryId") ?? "").trim();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const entryName = String(formData.get("entryName") ?? "").trim();
  const championPickTeamNumber = Number(formData.get("championPickTeamNumber") ?? 0);
  const selectedTeamNumbers = uniqueNumbers(
    formData
      .getAll("teamNumbers")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  );

  if (!entryId || !leagueId) {
    return { message: "Entry context is missing.", status: "error" };
  }

  if (!entryName) {
    return { message: "Give the roster a name before saving.", status: "error" };
  }

  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { message: auth.error ?? "Sign in required.", status: "error" };
  }

  const seasonPool = await getSeasonPool();
  if (seasonPool.season.entriesLockedAt) {
    return {
      message: "Entries are locked because Worlds qualification matches have started.",
      status: "error",
    };
  }

  if (!seasonPool.teams.length || !seasonPool.divisions.every((division) => division.id)) {
    return {
      message: "Run the roster sync first so division records exist in Supabase.",
      status: "error",
    };
  }

  const { data: existingEntry, error: entryLookupError } = await auth.supabase
    .from("entries")
    .select("id, locked_at")
    .eq("id", entryId)
    .eq("league_id", leagueId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (entryLookupError) {
    return { message: entryLookupError.message, status: "error" };
  }

  if (!existingEntry) {
    return { message: "Entry not found.", status: "error" };
  }

  if (existingEntry.locked_at) {
    return {
      message: "This entry is already locked and can no longer be edited.",
      status: "error",
    };
  }

  const invalidReason = validateEntrySelection(selectedTeamNumbers, seasonPool.teams);
  if (invalidReason) {
    return { message: invalidReason, status: "error" };
  }

  if (!selectedTeamNumbers.includes(championPickTeamNumber)) {
    return {
      message: "Champion pick must be one of the 12 drafted teams.",
      status: "error",
    };
  }

  const teamLookup = new Map(seasonPool.teams.map((team) => [team.teamNumber, team]));
  const divisionLookup = new Map(seasonPool.divisions.map((division) => [division.code, division]));

  const { error: updateError } = await auth.supabase
    .from("entries")
    .update({
      champion_pick_team_number: championPickTeamNumber,
      invalid_reason: null,
      is_valid: true,
      name: entryName,
      saved_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("league_id", leagueId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    return { message: updateError.message, status: "error" };
  }

  const { error: deleteError } = await auth.supabase.from("entry_teams").delete().eq("entry_id", entryId);
  if (deleteError) {
    return { message: deleteError.message, status: "error" };
  }

  const teamRows = selectedTeamNumbers.map((teamNumber, index) => {
    const team = teamLookup.get(teamNumber);
    const division = team ? divisionLookup.get(team.divisionCode) : null;

    return {
      division_group_id: division?.id ?? null,
      entry_id: entryId,
      slot_number: index + 1,
      team_number: teamNumber,
    };
  });

  const { error: insertError } = await auth.supabase.from("entry_teams").insert(teamRows);
  if (insertError) {
    return { message: insertError.message, status: "error" };
  }

  revalidatePath(`/entries/${entryId}`);
  revalidatePath(`/leagues/${String(formData.get("leagueCode") ?? "").trim()}`);
  revalidatePath("/dashboard");

  return { message: "Entry saved.", status: "success" };
}
