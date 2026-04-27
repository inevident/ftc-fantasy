import Link from "next/link";
import {
  CircleDot,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { seasonConfig, scoringRules } from "@/lib/constants";
import { getSeasonPool } from "@/lib/data";
import { formatTimestamp } from "@/lib/utils";

const officialDivisionFallback = [
  "Edison",
  "Franklin",
  "Goodall",
  "Jackson",
  "Lovelace",
  "Ross",
].map((name, index) => ({
  code: name.toLowerCase(),
  displayOrder: index,
  name,
  seasonId: seasonConfig.id,
  status: "official" as const,
  teamCount: 0,
}));

function getNumberMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : null;
}

export default async function Home() {
  const seasonPool = await getSeasonPool();
  const divisions = seasonPool.divisions.length ? seasonPool.divisions : officialDivisionFallback;
  const rosterMetadata = seasonPool.season.latestRosterSync?.metadata;
  const unassignedTeamCount = getNumberMetadata(rosterMetadata, "unassignedTeamCount") ?? 0;
  const isOfficial = seasonPool.season.divisionStatus === "official";
  const isLocked = Boolean(seasonPool.season.entriesLockedAt);
  const latestRosterSync = formatTimestamp(seasonPool.season.latestRosterSync?.finishedAt);
  const latestScoringSync = formatTimestamp(seasonPool.season.latestScoringSync?.finishedAt);
  const scoringMessage =
    typeof seasonPool.season.latestScoringSync?.metadata?.message === "string"
      ? seasonPool.season.latestScoringSync.metadata.message
      : "Scoring is ready to ingest qualification matches once FTC posts official match data.";

  const stats = [
    {
      icon: Users,
      label: "Entry format",
      value: `${seasonConfig.rosterPickCount} teams`,
      detail: `${seasonConfig.teamsPerDivision} from each official division, plus one champion tiebreak pick.`,
    },
    {
      icon: ShieldCheck,
      label: "Draft pool",
      value: seasonPool.season.teamCount ? `${seasonPool.season.teamCount} teams` : "Pending",
      detail:
        unassignedTeamCount > 0
          ? `${unassignedTeamCount} event-roster teams are excluded until FIRST assigns them to a division.`
          : "Only teams with a division assignment are draftable.",
    },
    {
      icon: Lock,
      label: "Entry lock",
      value: isLocked ? "Locked" : "Open",
      detail: isLocked
        ? `Locked ${formatTimestamp(seasonPool.season.entriesLockedAt)}.`
        : "Rosters lock at the first official Worlds qualification match.",
    },
  ];

  const syncCards = [
    {
      icon: RefreshCw,
      label: "Roster sync",
      value: latestRosterSync,
      detail:
        seasonPool.source === "database"
          ? "Reading from the Supabase cache."
          : seasonPool.source === "live-preview"
            ? "Showing a live FTC preview because the cache is unavailable."
            : "Waiting for Supabase and FTC credentials.",
    },
    {
      icon: TimerReset,
      label: "Scoring sync",
      value: latestScoringSync,
      detail: scoringMessage,
    },
  ];

  const scoringRows = [
    ["Qualification win", `+${scoringRules.qualificationWin}`],
    ["Qualification tie", `+${scoringRules.qualificationTie}`],
    ["Rank bonus", "+10 to +1"],
    ["Division playoff win", `+${scoringRules.playoffWin}`],
    ["Division finalist", `+${scoringRules.divisionFinalistBonus}`],
    ["Division champion", `+${scoringRules.divisionChampionBonus}`],
    ["da Vinci berth", `+${scoringRules.daVinciBerthBonus}`],
    ["Overall champion", `+${scoringRules.championBonus}`],
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_18%_14%,rgba(125,249,255,0.24),transparent_28%),radial-gradient(circle_at_84%_4%,rgba(255,203,89,0.24),transparent_28%),linear-gradient(180deg,rgba(5,8,22,0.3),rgba(5,8,22,1))]" />
      <div className="page-shell space-y-8">
        <section className="grid min-h-[calc(100vh-64px)] items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <StatusPill tone={isOfficial ? "success" : "accent"}>
                {isOfficial ? "Official divisions live" : "FTC Worlds 2026 fantasy"}
              </StatusPill>
              <StatusPill tone={isLocked ? "warning" : "accent"}>
                {isLocked ? "Rosters locked" : "Draft window open"}
              </StatusPill>
            </div>

            <div className="space-y-6">
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.96] text-white md:text-7xl">
                Draft Worlds like the pits are watching.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/74">
                Private FTC Fantasy leagues for the 2026 Championship: pick two
                teams from Edison, Franklin, Goodall, Jackson, Lovelace, and Ross,
                choose a champion tiebreaker, then let official match results move
                the leaderboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className="primary-link" href="/sign-in">
                Start or join a league
              </Link>
              <a
                className="secondary-link gap-2"
                href="https://ftc-events.firstinspires.org/2025/FTCCMP1"
                rel="noreferrer"
                target="_blank"
              >
                Official FTC event
                <ExternalLink aria-hidden className="h-4 w-4" />
              </a>
            </div>

            {seasonPool.message ? (
              <div className="max-w-3xl rounded-[24px] border border-amber-300/22 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                {seasonPool.message}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {stats.map(({ detail, icon: Icon, label, value }) => (
                <div
                  className="rounded-[26px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.24)] backdrop-blur"
                  key={label}
                >
                  <Icon aria-hidden className="h-5 w-5 text-cyan-200" />
                  <p className="mt-5 text-xs uppercase tracking-[0.24em] text-white/42">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-3 text-sm leading-6 text-white/62">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="relative rounded-[34px] border border-white/12 bg-[linear-gradient(155deg,rgba(11,18,35,0.94),rgba(3,8,18,0.96))] p-4 shadow-[0_36px_140px_rgba(0,0,0,0.44)]">
            <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
              <div className="border-b border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/42">Worlds board</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">2026 draft room</h2>
                    <p className="mt-1 text-sm text-white/56">
                      {isOfficial
                        ? "Official FIRST division assignments are active."
                        : "Using the live fallback until official divisions are cached."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-right">
                    <p className="text-3xl font-semibold text-white">
                      {seasonPool.season.teamCount || "0"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">draftable</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {divisions.map((division) => (
                  <div
                    className="group rounded-[22px] border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.055]"
                    key={division.code}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-200/22 bg-cyan-200/10 text-cyan-100">
                          <CircleDot aria-hidden className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-white">{division.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Pick {seasonConfig.teamsPerDivision}
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-white">
                        {division.teamCount ?? 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-5">
                <div className="flex items-center gap-3 rounded-[22px] border border-amber-300/20 bg-amber-300/10 p-4">
                  <Trophy aria-hidden className="h-5 w-5 shrink-0 text-amber-200" />
                  <p className="text-sm leading-6 text-amber-50/86">
                    Champion pick breaks leaderboard ties before highest single-team
                    score and final save time.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.24)]">
            <p className="eyebrow">Live operations</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Built for the pre-match window.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64">
              Division remaps preserve selected teams, mark illegal splits, and
              keep entries editable until the first Worlds qualification match
              starts. After lock, the builder becomes read-only and scoring takes
              over.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {syncCards.map(({ detail, icon: Icon, label, value }) => (
                <div className="rounded-[24px] border border-white/10 bg-black/18 p-5" key={label}>
                  <div className="flex items-center gap-3">
                    <Icon aria-hidden className="h-5 w-5 text-cyan-200" />
                    <p className="text-xs uppercase tracking-[0.24em] text-white/42">{label}</p>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/60">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,203,89,0.1),rgba(125,249,255,0.06)_44%,rgba(255,255,255,0.035))] p-6">
            <p className="eyebrow">Scoring preset</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Simple, match-first, hard to game.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {scoringRows.map(([label, points]) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/42 px-4 py-3"
                  key={label}
                >
                  <span className="text-sm text-white/70">{label}</span>
                  <span className="font-mono text-sm font-semibold text-amber-100">{points}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/58">
              No judged awards, trades, waivers, or public drafts in v1. Private
              leagues stay focused on picking the best twelve-team Worlds roster.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
