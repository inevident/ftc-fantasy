"use client";

import { useActionState, useState } from "react";

import { saveEntryAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { seasonConfig } from "@/lib/constants";
import type { ActionState, DivisionGroup, QualifiedTeam } from "@/lib/types";
import { cn, formatLocation, formatTeamLabel } from "@/lib/utils";

const initialState: ActionState = { status: "idle" };

type EntryBuilderProps = {
  championPickTeamNumber?: number | null;
  defaultEntryName: string;
  divisionStatus: "official" | "provisional";
  divisions: DivisionGroup[];
  entryId: string;
  invalidReason?: string | null;
  isLocked: boolean;
  leagueCode: string;
  leagueId: string;
  selectedTeamNumbers: number[];
  teams: QualifiedTeam[];
};

export function EntryBuilder({
  championPickTeamNumber,
  defaultEntryName,
  divisionStatus,
  divisions,
  entryId,
  invalidReason,
  isLocked,
  leagueCode,
  leagueId,
  selectedTeamNumbers,
  teams,
}: EntryBuilderProps) {
  const [state, action] = useActionState(saveEntryAction, initialState);
  const [entryName, setEntryName] = useState(defaultEntryName);
  const [selected, setSelected] = useState<number[]>(selectedTeamNumbers);
  const [championPick, setChampionPick] = useState<number | null>(championPickTeamNumber ?? null);

  const teamsByDivision = divisions.map((division) => ({
    division,
    teams: teams.filter((team) => team.divisionCode === division.code),
  }));

  const selectedSet = new Set(selected);
  const divisionCounts = selected.reduce<Record<string, number>>((accumulator, teamNumber) => {
    const team = teams.find((candidate) => candidate.teamNumber === teamNumber);
    if (!team) {
      return accumulator;
    }

    accumulator[team.divisionCode] = (accumulator[team.divisionCode] ?? 0) + 1;
    return accumulator;
  }, {});

  const canSave =
    !isLocked &&
    selected.length === seasonConfig.rosterPickCount &&
    divisions.every((division) => divisionCounts[division.code] === seasonConfig.teamsPerDivision) &&
    championPick !== null;

  const statusMessage = isLocked
    ? "Entries are locked because Worlds qualification matches have started."
    : divisionStatus === "official" && invalidReason
      ? "Official divisions are live. Rebalance this roster before the lock hits."
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form action={action} className="space-y-6">
        <input name="entryId" type="hidden" value={entryId} />
        <input name="leagueCode" type="hidden" value={leagueCode} />
        <input name="leagueId" type="hidden" value={leagueId} />
        {selected.map((teamNumber) => (
          <input key={teamNumber} name="teamNumbers" type="hidden" value={teamNumber} />
        ))}
        <input name="championPickTeamNumber" type="hidden" value={championPick ?? ""} />

        <label className="block space-y-2">
          <span className="text-sm uppercase tracking-[0.2em] text-white/58">Roster name</span>
          <input
            className="w-full rounded-2xl border border-white/14 bg-white/6 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
            disabled={isLocked}
            name="entryName"
            onChange={(event) => setEntryName(event.target.value)}
            value={entryName}
          />
        </label>

        {teamsByDivision.map(({ division, teams: divisionTeams }) => {
          const divisionCount = divisionCounts[division.code] ?? 0;

          return (
            <section
              className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
              key={division.code}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{division.name}</h2>
                  <p className="text-sm text-white/56">
                    Pick {seasonConfig.teamsPerDivision} teams from this group.
                  </p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
                  {divisionCount}/{seasonConfig.teamsPerDivision}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {divisionTeams.map((team) => {
                  const checked = selectedSet.has(team.teamNumber);
                  const disableUnchecked =
                    !checked && divisionCount >= seasonConfig.teamsPerDivision;

                  return (
                    <label
                      className={cn(
                        "block rounded-2xl border p-4 transition",
                        checked
                          ? "border-cyan-300/55 bg-cyan-400/10"
                          : "border-white/10 bg-slate-950/55 hover:border-white/22",
                        disableUnchecked && "opacity-45",
                      )}
                      key={team.teamNumber}
                    >
                      <input
                        checked={checked}
                        className="sr-only"
                        disabled={isLocked || disableUnchecked}
                        name={`toggle-${team.teamNumber}`}
                        onChange={() => {
                          if (isLocked) {
                            return;
                          }

                          setSelected((current) => {
                            if (current.includes(team.teamNumber)) {
                              const next = current.filter((value) => value !== team.teamNumber);
                              if (championPick === team.teamNumber) {
                                setChampionPick(null);
                              }
                              return next;
                            }

                            if (current.length >= seasonConfig.rosterPickCount) {
                              return current;
                            }

                            return [...current, team.teamNumber];
                          });
                        }}
                        type="checkbox"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{formatTeamLabel(team)}</p>
                          <p className="mt-1 text-sm text-white/72">{team.nameFull ?? team.schoolName}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/44">
                            {formatLocation(team)}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-medium text-white/76">
                          #{team.teamNumber}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-white">Save roster</h2>
          <p className="mt-2 text-sm text-white/62">
            Final validation still happens on the server. This screen just keeps the draft playable.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton
              className={cn(
                "w-full justify-center sm:w-auto",
                !canSave && "cursor-not-allowed opacity-60",
              )}
              disabled={!canSave}
              idleLabel="Save entry"
              pendingLabel="Saving entry"
            />
            <span className="text-sm text-white/66">
              {selected.length}/{seasonConfig.rosterPickCount} teams selected
            </span>
          </div>
          {state.message ? (
            <p className={state.status === "error" ? "mt-3 text-sm text-amber-200" : "mt-3 text-sm text-emerald-200"}>
              {state.message}
            </p>
          ) : statusMessage ? (
            <p className="mt-3 text-sm text-amber-200">{statusMessage}</p>
          ) : invalidReason ? (
            <p className="mt-3 text-sm text-amber-200">{invalidReason}</p>
          ) : null}
        </div>
      </form>

      <aside className="space-y-4 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(6,10,21,0.96),rgba(8,14,31,0.96))] p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">Champion tiebreak</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Pick one drafted team</h2>
          <p className="mt-2 text-sm text-white/62">
            Correct champion pick is the first leaderboard tiebreaker.
          </p>
        </div>

        <div className="space-y-2">
          {selected.length ? (
            selected
              .map((teamNumber) => teams.find((team) => team.teamNumber === teamNumber))
              .filter(Boolean)
              .map((team) => (
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition",
                    championPick === team!.teamNumber
                      ? "border-amber-300/50 bg-amber-300/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                  key={team!.teamNumber}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{formatTeamLabel(team!)}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/42">
                      {team!.divisionName}
                    </p>
                  </div>
                  <input
                    checked={championPick === team!.teamNumber}
                    className="h-4 w-4 accent-amber-300"
                    disabled={isLocked}
                    name="champion-display"
                    onChange={() => setChampionPick(team!.teamNumber)}
                    type="radio"
                  />
                </label>
              ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-white/54">
              Draft teams first, then pick the champion from your roster.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
