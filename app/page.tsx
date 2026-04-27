import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  Swords,
  TimerReset,
  Trophy,
  Users,
  Zap,
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

  const howItWorks = [
    {
      icon: Users,
      title: "Create or join a league",
      description: "Sign in, start a private league, and share the invite code with your alliance.",
    },
    {
      icon: Swords,
      title: "Draft your roster",
      description: `Pick ${seasonConfig.teamsPerDivision} teams from each of the 6 official Worlds divisions — ${seasonConfig.rosterPickCount} total.`,
    },
    {
      icon: Trophy,
      title: "Choose your champion",
      description: "Lock in one team as your champion tiebreaker pick to break leaderboard deadlocks.",
    },
    {
      icon: Zap,
      title: "Watch scores roll in",
      description: "Official match results auto-sync and move the leaderboard in real time.",
    },
  ];

  return (
    <main className="relative isolate overflow-hidden">
      {/* ── Ambient glow orbs ─────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div className="absolute left-[10%] top-[5%] h-[420px] w-[420px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute right-[8%] top-[2%] h-[340px] w-[340px] rounded-full bg-rose-500/10 blur-[100px]" />
        <div className="absolute left-[45%] top-[30%] h-[260px] w-[260px] rounded-full bg-cyan-400/8 blur-[80px]" />
      </div>

      <div className="page-shell space-y-20">
        {/* ═══════════════════════════════════════════════ */}
        {/* HERO                                           */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="grid min-h-[calc(100vh-80px)] items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          {/* ── Left column ──────────────────────────── */}
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3 animate-slide-up">
              <StatusPill tone={isOfficial ? "success" : "accent"}>
                {isOfficial ? "Official divisions live" : "FTC Worlds 2026 fantasy"}
              </StatusPill>
              <StatusPill tone={isLocked ? "warning" : "accent"}>
                {isLocked ? "Rosters locked" : "Draft window open"}
              </StatusPill>
            </div>

            <div className="space-y-6 animate-slide-up-delay-1">
              <h1
                className="max-w-[720px] text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-[5.2rem]"
                style={{ fontFamily: "var(--font-russo-one)" }}
              >
                <span className="text-white">Draft Worlds</span>
                <br />
                <span className="gradient-text">like the pits</span>
                <br />
                <span className="text-white">are watching.</span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300/80">
                Private FTC Fantasy leagues for the 2026 Championship — pick two
                teams from Edison, Franklin, Goodall, Jackson, Lovelace, and Ross,
                choose a champion tiebreaker, then let official match results move
                the leaderboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 animate-slide-up-delay-2">
              <Link className="primary-link gap-2" href="/sign-in" id="hero-cta-start">
                Start or join a league
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a
                className="secondary-link gap-2"
                href="https://ftc-events.firstinspires.org/2025/FTCCMP1"
                rel="noreferrer"
                target="_blank"
                id="hero-cta-ftc"
              >
                Official FTC event
                <ExternalLink aria-hidden className="h-4 w-4" />
              </a>
            </div>

            {seasonPool.message ? (
              <div className="max-w-3xl rounded-2xl border border-rose-400/20 bg-rose-500/8 p-4 text-sm leading-6 text-rose-100">
                {seasonPool.message}
              </div>
            ) : null}

            {/* ── Quick stat cards ───────────────────── */}
            <div className="grid gap-4 md:grid-cols-3 animate-slide-up-delay-3">
              {stats.map(({ detail, icon: Icon, label, value }) => (
                <div
                  className="glow-card p-5 cursor-pointer"
                  key={label}
                  id={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 border border-violet-400/20">
                      <Icon aria-hidden className="h-4 w-4 text-violet-300" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-white">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: Draft board ─────────────── */}
          <aside className="relative scanline-overlay rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-[rgba(15,15,50,0.95)] to-[rgba(10,10,30,0.98)] p-1 shadow-[0_0_80px_rgba(124,58,237,0.12)]">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl animate-float" />
            <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

            <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(8,8,24,0.8)]">
              {/* Board header */}
              <div className="border-b border-white/8 bg-white/[0.03] p-5">
                <p className="eyebrow">Worlds board</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <h2
                      className="text-2xl font-bold text-white neon-text"
                      style={{ fontFamily: "var(--font-russo-one)" }}
                    >
                      2026 draft room
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {isOfficial
                        ? "Official FIRST division assignments are active."
                        : "Using the live fallback until official divisions are cached."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 px-4 py-3 text-right">
                    <p className="text-3xl font-bold text-white neon-text">
                      {seasonPool.season.teamCount || "0"}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/60">draftable</p>
                  </div>
                </div>
              </div>

              {/* Division cards */}
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {divisions.map((division, i) => (
                  <div
                    className="group glow-card p-4 cursor-pointer"
                    key={division.code}
                    id={`division-${division.code}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-200 transition-colors group-hover:bg-violet-500/20 group-hover:border-violet-400/35">
                          <CircleDot aria-hidden className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-white">{division.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Pick {seasonConfig.teamsPerDivision}
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-white">
                        {division.teamCount ?? 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Champion pick callout */}
              <div className="border-t border-white/8 p-5">
                <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/8 p-4">
                  <Trophy aria-hidden className="h-5 w-5 shrink-0 text-rose-300" />
                  <p className="text-sm leading-6 text-rose-100/80">
                    Champion pick breaks leaderboard ties before highest single-team
                    score and final save time.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Neon divider ────────────────────────────── */}
        <div className="neon-divider" />

        {/* ═══════════════════════════════════════════════ */}
        {/* HOW IT WORKS                                   */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="how-it-works">
          <div className="text-center space-y-4">
            <p className="eyebrow">How it works</p>
            <h2
              className="text-4xl font-bold text-white md:text-5xl neon-text"
              style={{ fontFamily: "var(--font-russo-one)" }}
            >
              Four steps to the leaderboard
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-400">
              From sign-up to championship Sunday — here&apos;s how the draft plays out.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map(({ description, icon: Icon, title }, i) => (
              <div className="glow-card p-6 text-center cursor-pointer group" key={title} id={`step-${i + 1}`}>
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-rose-500/10 border border-violet-400/20 transition-all group-hover:from-violet-500/30 group-hover:to-rose-500/20 group-hover:border-violet-400/35 group-hover:shadow-[0_0_24px_rgba(124,58,237,0.2)]">
                  <Icon aria-hidden className="h-6 w-6 text-violet-300" />
                </div>
                <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-bold text-violet-300">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Neon divider ────────────────────────────── */}
        <div className="neon-divider" />

        {/* ═══════════════════════════════════════════════ */}
        {/* LIVE OPS + SCORING                             */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" id="operations-scoring">
          {/* ── Live operations ──────────────────────── */}
          <div className="glow-card p-7">
            <p className="eyebrow">Live operations</p>
            <h2
              className="mt-3 text-3xl font-bold text-white neon-text"
              style={{ fontFamily: "var(--font-russo-one)" }}
            >
              Built for the pre-match window.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Division remaps preserve selected teams, mark illegal splits, and
              keep entries editable until the first Worlds qualification match
              starts. After lock, the builder becomes read-only and scoring takes
              over.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {syncCards.map(({ detail, icon: Icon, label, value }) => (
                <div
                  className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition-all hover:border-violet-500/25 hover:bg-violet-500/[0.04]"
                  key={label}
                  id={`sync-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/12 border border-violet-400/15">
                      <Icon aria-hidden className="h-4 w-4 text-violet-300" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400/80">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Scoring preset ───────────────────────── */}
          <div className="glow-card p-7 bg-gradient-to-br from-[rgba(124,58,237,0.06)] via-[rgba(244,63,94,0.04)] to-[rgba(34,211,238,0.02)]">
            <p className="eyebrow">Scoring preset</p>
            <h2
              className="mt-3 text-3xl font-bold text-white neon-text-rose"
              style={{ fontFamily: "var(--font-russo-one)" }}
            >
              Simple, match-first, hard to game.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {scoringRows.map(([label, points]) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-[rgba(8,8,24,0.5)] px-4 py-3 transition-all hover:border-violet-500/25 hover:bg-violet-500/[0.04] cursor-pointer"
                  key={label}
                  id={`scoring-${label?.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="text-sm text-slate-300/80">{label}</span>
                  <span className="font-mono text-sm font-bold text-rose-300">{points}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              No judged awards, trades, waivers, or public drafts in v1. Private
              leagues stay focused on picking the best twelve-team Worlds roster.
            </p>
          </div>
        </section>

        {/* ── Neon divider ────────────────────────────── */}
        <div className="neon-divider" />

        {/* ═══════════════════════════════════════════════ */}
        {/* BOTTOM CTA                                     */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="relative text-center py-16" id="bottom-cta">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-violet-600/8 blur-[100px]" />
          </div>
          <h2
            className="text-4xl font-bold text-white md:text-5xl neon-text"
            style={{ fontFamily: "var(--font-russo-one)" }}
          >
            Ready to draft?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-400">
            Create a private league, invite your crew, and build your ultimate
            Worlds roster before the first match drops.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link className="primary-link gap-2" href="/sign-in" id="bottom-cta-start">
              Get started now
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="border-t border-white/6 pt-8 pb-4 text-center" id="footer">
          <p className="text-xs text-slate-600">
            FTC Fantasy Worlds 2026 &middot; Not affiliated with or endorsed by FIRST&reg;
          </p>
        </footer>
      </div>
    </main>
  );
}
