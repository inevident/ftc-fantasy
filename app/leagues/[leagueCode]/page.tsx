import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createOrOpenEntryDirectAction, joinLeagueDirectAction } from "@/app/actions";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { loadLeaguePageData } from "@/lib/data";
import { formatTimestamp } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

type LeaguePageProps = {
  params: Promise<{ leagueCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaguePage({ params, searchParams }: LeaguePageProps) {
  const { leagueCode } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect(`/sign-in?next=/leagues/${leagueCode}`);
  }

  const data = await loadLeaguePageData(leagueCode, user.id);

  if (data.kind === "missing") {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <StatusPill tone="accent">League room</StatusPill>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              {data.league.name}
            </h1>
            <p className="mt-2 text-base text-white/66">
              Invite code <span className="font-semibold text-white">{data.league.inviteCode}</span>
            </p>
          </div>
        </div>

      </section>

      {!data.league.isMember ? (
        <SectionCard className="max-w-2xl">
          <p className="eyebrow">Invite preview</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Join this private league to draft and score.</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            This invite code is valid. Join to view the live leaderboard, create an entry,
            and track roster validity once the official division remap lands.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
            <p>Division mode: <span className="font-semibold text-white">{data.seasonPool.season.divisionStatus}</span></p>
            <p className="mt-1">Entry lock: <span className="font-semibold text-white">{data.league.entryLocked ? "locked" : "open"}</span></p>
          </div>
          <form action={joinLeagueDirectAction} className="mt-6 space-y-4">
            <input name="inviteCode" type="hidden" value={data.league.inviteCode} />
            <SubmitButton idleLabel="Join this league" pendingLabel="Joining league" />
          </form>
          {error ? (
            <p className="mt-4 text-sm text-amber-200">{error}</p>
          ) : null}
        </SectionCard>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Your entry</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {data.league.currentUserEntryId ? "Edit roster" : "Create roster"}
                  </h2>
                </div>
                <StatusPill
                  tone={
                    data.league.entryLocked
                      ? "muted"
                      : data.seasonPool.season.divisionStatus === "official"
                        ? "success"
                        : "warning"
                  }
                >
                  {data.league.entryLocked ? "locked" : data.seasonPool.season.divisionStatus}
                </StatusPill>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/64">
                {data.league.entryLocked
                  ? "Entries are locked. You can still review your roster and the leaderboard."
                  : `Draft ${data.seasonPool.season.entryPickCount} teams, keep exactly ${data.seasonPool.season.teamsPerDivision} in each division, and name a champion tiebreak pick.`}
              </p>

              {data.league.currentUserEntryId ? (
                <Link className="primary-link mt-6" href={`/entries/${data.league.currentUserEntryId}`}>
                  Open your entry
                </Link>
              ) : (
                <form action={createOrOpenEntryDirectAction} className="mt-6">
                  <input name="leagueId" type="hidden" value={data.league.id} />
                  <input name="leagueCode" type="hidden" value={data.league.inviteCode} />
                  <SubmitButton
                    disabled={data.league.entryLocked}
                    idleLabel="Create your entry"
                    pendingLabel="Opening entry"
                  />
                </form>
              )}
              {error ? (
                <p className="mt-4 text-sm text-amber-200">{error}</p>
              ) : null}
            </SectionCard>

            <SectionCard>
              <p className="eyebrow">League members</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {data.league.members.length} managers
              </h2>
              <div className="mt-5 space-y-3">
                {data.league.members.map((member) => (
                  <div
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    key={member.userId}
                  >
                    <div>
                      <p className="font-medium text-white">{member.displayName}</p>
                      <p className="text-sm text-white/46">{member.email ?? "Email hidden"}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.18em] text-white/44">
                      <p>{member.role}</p>
                      <p className="mt-1">{formatTimestamp(member.joinedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="eyebrow">Leaderboard</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Current standings</h2>
                </div>
                <p className="text-sm text-white/54">
                  Tiebreaks: correct champion pick, highest single-team score, earliest save.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {data.league.leaderboard.length ? (
                  data.league.leaderboard.map((row, index) => (
                    <div
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                      key={row.entryId}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/64">
                              #{index + 1}
                            </span>
                            <h3 className="text-xl font-semibold text-white">{row.entryName}</h3>
                          </div>
                          <p className="mt-2 text-sm text-white/56">{row.userLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-semibold text-white">{row.totalPoints}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/44">
                            pts
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                          <p className="eyebrow">Champion pick</p>
                          <p className="mt-2 text-sm text-white">
                            {row.championPickTeamNumber ? `#${row.championPickTeamNumber}` : "Not set"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                          <p className="eyebrow">Hit</p>
                          <p className="mt-2 text-sm text-white">
                            {row.championHit ? "Correct champion" : "Waiting on finals"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                          <p className="eyebrow">Best team</p>
                          <p className="mt-2 text-sm text-white">{row.highestSingleTeamScore} pts</p>
                        </div>
                      </div>

                      {row.invalidReason ? (
                        <p className="mt-4 rounded-2xl border border-amber-300/24 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                          {row.invalidReason}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/14 px-5 py-8 text-sm text-white/56">
                    No entries saved yet. The first manager to draft sets the pace.
                  </div>
                )}
              </div>
            </SectionCard>
          </section>
        </>
      )}
    </main>
  );
}
