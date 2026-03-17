import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EntryBuilder } from "@/components/entry-builder";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { loadEntryPageData } from "@/lib/data";
import { createClient } from "@/utils/supabase/server";

type EntryPageProps = {
  params: Promise<{ entryId: string }>;
};

export default async function EntryPage({ params }: EntryPageProps) {
  const { entryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect(`/sign-in?next=/entries/${entryId}`);
  }

  const data = await loadEntryPageData(entryId, user.id);

  if (data.kind === "missing") {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <StatusPill tone="accent">Entry builder</StatusPill>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              {data.entry.entryName}
            </h1>
            <p className="mt-2 text-base text-white/66">
              League{" "}
              <Link className="font-semibold text-white underline decoration-white/20 underline-offset-4" href={`/leagues/${data.entry.leagueCode}`}>
                {data.entry.leagueName}
              </Link>
            </p>
          </div>
        </div>
        <StatusPill
          tone={
            data.seasonPool.season.divisionStatus === "official" ? "success" : "warning"
          }
        >
          {data.seasonPool.season.divisionStatus}
        </StatusPill>
      </section>

      {data.seasonPool.message ? (
        <SectionCard className="mb-6">
          <p className="text-sm text-amber-100">{data.seasonPool.message}</p>
        </SectionCard>
      ) : null}

      <EntryBuilder
        championPickTeamNumber={data.entry.championPickTeamNumber}
        defaultEntryName={data.entry.entryName}
        divisions={data.seasonPool.divisions}
        entryId={data.entry.entryId}
        invalidReason={data.entry.invalidReason}
        leagueCode={data.entry.leagueCode}
        leagueId={data.entry.leagueId}
        selectedTeamNumbers={data.entry.selectedTeamNumbers}
        teams={data.seasonPool.teams}
      />
    </main>
  );
}

