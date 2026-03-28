import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { seasonConfig, scoringRules } from "@/lib/constants";
import { getSeasonPool } from "@/lib/data";
import { formatTimestamp } from "@/lib/utils";

export default async function Home() {
  const seasonPool = await getSeasonPool();

  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="space-y-6">
          <StatusPill tone="accent">FTC Worlds 2026 fantasy build</StatusPill>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white md:text-7xl">
              Draft the full Worlds field before the real divisions lock.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/72">
              FTC Fantasy turns the 2026 championship into a private league game:
              six divisions, two picks per division, live scoring from official FTC
              results, and automatic roster rebalancing once FIRST publishes the
              real assignments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="primary-link" href="/sign-in">
              Enter the league lobby
            </Link>
            <a
              className="secondary-link"
              href="https://ftc-events.firstinspires.org/2025/FTCCMP1"
              rel="noreferrer"
              target="_blank"
            >
              Worlds roster source
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SectionCard className="p-5">
              <p className="eyebrow">Entry format</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {seasonConfig.rosterPickCount}
              </p>
              <p className="mt-2 text-sm text-white/62">
                teams per entry, with {seasonConfig.teamsPerDivision} per division
                and a required champion tiebreak pick.
              </p>
            </SectionCard>
            <SectionCard className="p-5">
              <p className="eyebrow">Current pool</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {seasonPool.season.teamCount || "Live"}
              </p>
              <p className="mt-2 text-sm text-white/62">
                Worlds-qualified teams available through the sync pipeline.
              </p>
            </SectionCard>
            <SectionCard className="p-5">
              <p className="eyebrow">Division mode</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {seasonPool.season.divisionStatus === "official" ? "Official" : "Provisional"}
              </p>
              <p className="mt-2 text-sm text-white/62">
                {seasonPool.season.divisionStatus === "official"
                  ? "Real championship assignments are live."
                  : "Using temporary six-division seeding until FIRST publishes assignments."}
              </p>
            </SectionCard>
          </div>
        </div>

        <SectionCard className="space-y-5">
          <div>
            <p className="eyebrow">Sync status</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Season operations board</h2>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            <p>
              Source:{" "}
              <span className="font-medium text-white">
                {seasonPool.source === "database"
                  ? "Supabase cache"
                  : seasonPool.source === "live-preview"
                    ? "Live FTC preview"
                    : "Setup pending"}
              </span>
            </p>
            <p>
              Roster sync:{" "}
              <span className="font-medium text-white">
                {formatTimestamp(seasonPool.season.latestRosterSync?.finishedAt)}
              </span>
            </p>
            <p>
              Scoring sync:{" "}
              <span className="font-medium text-white">
                {formatTimestamp(seasonPool.season.latestScoringSync?.finishedAt)}
              </span>
            </p>
            <p>
              Lock mode:{" "}
              <span className="font-medium text-white">{seasonPool.season.lockMode}</span>
            </p>
            <p>
              Entry lock:{" "}
              <span className="font-medium text-white">
                {seasonPool.season.entriesLockedAt ? "Locked" : "Open"}
              </span>
            </p>
          </div>

          {seasonPool.message ? (
            <div className="rounded-2xl border border-amber-300/24 bg-amber-300/10 p-4 text-sm text-amber-100">
              {seasonPool.message}
            </div>
          ) : null}

          {typeof seasonPool.season.latestScoringSync?.metadata?.message === "string" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/68">
              {seasonPool.season.latestScoringSync.metadata.message}
            </div>
          ) : null}

          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="eyebrow">Scoring frame</p>
            <ul className="mt-4 space-y-3 text-sm text-white/66">
              <li>Qualification win: +{scoringRules.qualificationWin}</li>
              <li>Qualification tie: +{scoringRules.qualificationTie}</li>
              <li>Division playoff win: +{scoringRules.playoffWin}</li>
              <li>Division champion: +{scoringRules.divisionChampionBonus}</li>
              <li>da Vinci berth: +{scoringRules.daVinciBerthBonus}</li>
              <li>Overall champion: +{scoringRules.championBonus}</li>
            </ul>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard>
          <p className="eyebrow">Why this shape</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">2026 first</p>
              <p className="text-sm leading-7 text-white/62">
                The app targets the expanded six-division championship format
                instead of freezing the game around last year’s four-division
                layout.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">League-native</p>
              <p className="text-sm leading-7 text-white/62">
                Private invite-code leagues keep the product focused on actual
                FTC communities instead of a public social feed.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-lg font-semibold text-white">Remap-safe</p>
              <p className="text-sm leading-7 text-white/62">
                Once official divisions appear, saved entries keep every drafted
                team and only ask managers to rebalance illegal splits.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Reference notes</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-white/66">
            <p>
              Last year’s championship division flow is the interaction model
              reference. The actual 2026 season logic in this app uses six
              groups and a post-division da Vinci round.
            </p>
            <p>
              The FTC API season code for the 2026 Worlds event is{" "}
              <span className="font-semibold text-white">2025</span>, matching the
              official event site path.
            </p>
            <p>
              Roster sync and scoring sync are exposed as server routes so you
              can wire them into cron or trigger them manually while you test.
            </p>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
