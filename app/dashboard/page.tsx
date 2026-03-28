import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateLeagueForm, JoinLeagueForm } from "@/components/league-forms";
import { SectionCard } from "@/components/section-card";
import { SignOutForm } from "@/components/sign-out-form";
import { StatusPill } from "@/components/status-pill";
import { loadDashboardData } from "@/lib/data";
import { formatTimestamp } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/sign-in?next=/dashboard");
  }

  const dashboard = await loadDashboardData(user.id, user.email);

  return (
    <main className="page-shell">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <StatusPill tone="accent">Manager dashboard</StatusPill>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              {user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "FTC Manager"}
            </h1>
            <p className="mt-2 text-base text-white/66">
              Build rosters, join private leagues, and monitor Worlds sync status in
              one place.
            </p>
          </div>
        </div>
        <SignOutForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Season pool</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {dashboard.seasonPool.season.teamCount || "Live preview"} teams
              </h2>
            </div>
            <StatusPill
              tone={
                dashboard.seasonPool.season.divisionStatus === "official"
                  ? "success"
                  : "warning"
              }
            >
              {dashboard.seasonPool.season.divisionStatus}
            </StatusPill>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Source</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {dashboard.seasonPool.source === "database"
                  ? "Cached sync"
                  : dashboard.seasonPool.source === "live-preview"
                    ? "FTC preview"
                    : "Not ready"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Roster sync</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {formatTimestamp(dashboard.seasonPool.season.latestRosterSync?.finishedAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Scoring sync</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {formatTimestamp(dashboard.seasonPool.season.latestScoringSync?.finishedAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Entry lock</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {dashboard.seasonPool.season.entriesLockedAt ? "Locked" : "Open"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Official divisions</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {formatTimestamp(dashboard.seasonPool.season.officialDivisionsPublishedAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow">Lock mode</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {dashboard.seasonPool.season.lockMode}
              </p>
            </div>
          </div>

          {dashboard.setupMessage || dashboard.seasonPool.message ? (
            <div className="rounded-2xl border border-amber-300/24 bg-amber-300/10 p-4 text-sm text-amber-100">
              {dashboard.setupMessage ?? dashboard.seasonPool.message}
            </div>
          ) : null}

          {typeof dashboard.seasonPool.season.latestScoringSync?.metadata?.message === "string" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/68">
              {dashboard.seasonPool.season.latestScoringSync.metadata.message}
            </div>
          ) : null}
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard>
            <p className="eyebrow">Create</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Start a new league</h2>
            <p className="mt-2 text-sm text-white/60">
              Private invite-code only. The creator becomes the owner automatically.
            </p>
            <div className="mt-5">
              <CreateLeagueForm />
            </div>
          </SectionCard>

          <SectionCard>
            <p className="eyebrow">Join</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Enter with an invite code</h2>
            <p className="mt-2 text-sm text-white/60">
              Use the exact code from an existing league manager.
            </p>
            <div className="mt-5">
              <JoinLeagueForm />
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="mt-6">
        <SectionCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Your leagues</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {dashboard.leagues.length ? `${dashboard.leagues.length} active leagues` : "No leagues yet"}
              </h2>
            </div>
            <p className="text-sm text-white/50">
              One active entry per league. Drafts and leaderboards live inside each invite code.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.leagues.length ? (
              dashboard.leagues.map((league) => (
                <Link
                  className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-300/38 hover:bg-cyan-300/[0.06]"
                  href={`/leagues/${league.inviteCode}`}
                  key={league.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{league.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                        {league.inviteCode}
                      </p>
                    </div>
                    <StatusPill tone="muted">{league.role}</StatusPill>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-white/60">
                    <p>{league.memberCount} managers</p>
                    <p>{league.entryCount} saved entries</p>
                    <p>Created {formatTimestamp(league.createdAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/14 px-5 py-8 text-sm text-white/56">
                Create a league or join one with an invite code to start drafting.
              </div>
            )}
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
