"use client";

import { useActionState, useCallback, useMemo, useRef, useState, useEffect } from "react";

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

/* ------------------------------------------------------------------ */
/*  Search icon (inline SVG to avoid extra deps)                      */
/* ------------------------------------------------------------------ */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function matchesSearch(team: QualifiedTeam, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    String(team.teamNumber).includes(q) ||
    (team.nameShort?.toLowerCase().includes(q) ?? false) ||
    (team.nameFull?.toLowerCase().includes(q) ?? false) ||
    (team.schoolName?.toLowerCase().includes(q) ?? false) ||
    (team.city?.toLowerCase().includes(q) ?? false) ||
    (team.stateProv?.toLowerCase().includes(q) ?? false) ||
    (team.country?.toLowerCase().includes(q) ?? false) ||
    (team.robotName?.toLowerCase().includes(q) ?? false)
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
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

  /* ---- search / filter state ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const divisionRefs = useRef<Record<string, HTMLElement | null>>({});

  /* Keyboard shortcut: Ctrl/Cmd + K to focus search */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---- derived data ---- */
  const selectedSet = new Set(selected);

  const teamsByDivision = useMemo(
    () =>
      divisions.map((division) => ({
        division,
        teams: teams.filter((team) => team.divisionCode === division.code),
      })),
    [divisions, teams],
  );

  const filteredTeamsByDivision = useMemo(
    () =>
      teamsByDivision.map(({ division, teams: divTeams }) => ({
        division,
        teams: divTeams,
        filteredTeams: divTeams.filter((t) => matchesSearch(t, searchQuery)),
      })),
    [teamsByDivision, searchQuery],
  );

  const totalMatches = useMemo(
    () => filteredTeamsByDivision.reduce((sum, d) => sum + d.filteredTeams.length, 0),
    [filteredTeamsByDivision],
  );

  const divisionCounts = selected.reduce<Record<string, number>>((accumulator, teamNumber) => {
    const team = teams.find((candidate) => candidate.teamNumber === teamNumber);
    if (!team) {
      return accumulator;
    }

    accumulator[team.divisionCode] = (accumulator[team.divisionCode] ?? 0) + 1;
    return accumulator;
  }, {});

  /* ---- save readiness ---- */
  const missingSteps: string[] = [];
  if (selected.length < seasonConfig.rosterPickCount) {
    missingSteps.push(`Draft ${seasonConfig.rosterPickCount - selected.length} more team${seasonConfig.rosterPickCount - selected.length === 1 ? "" : "s"}`);
  }
  const unbalancedDivisions = divisions.filter(
    (d) => (divisionCounts[d.code] ?? 0) !== seasonConfig.teamsPerDivision,
  );
  if (selected.length === seasonConfig.rosterPickCount && unbalancedDivisions.length > 0) {
    missingSteps.push(
      `Balance divisions: ${unbalancedDivisions.map((d) => `${d.name} (${divisionCounts[d.code] ?? 0}/${seasonConfig.teamsPerDivision})`).join(", ")}`,
    );
  }
  if (championPick === null && selected.length > 0) {
    missingSteps.push("Pick a champion tiebreak team in the sidebar →");
  }

  const canSave = !isLocked && missingSteps.length === 0;

  const statusMessage = isLocked
    ? "Entries are locked because Worlds qualification matches have started."
    : divisionStatus === "official" && invalidReason
      ? "Official divisions are live. Rebalance this roster before the lock hits."
      : null;

  /* ---- callbacks ---- */
  const scrollToDivision = useCallback((code: string) => {
    setActiveDivision(code);
    const el = divisionRefs.current[code];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveDivision(null);
    searchRef.current?.focus();
  }, []);

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

        {/* ============================================= */}
        {/*  SEARCH & FILTER TOOLBAR                      */}
        {/* ============================================= */}
        <div
          className="sticky top-0 z-20 -mx-1 space-y-3 rounded-[24px] border border-white/10 bg-[rgba(10,10,28,0.92)] p-4 backdrop-blur-xl"
          style={{ backdropFilter: "blur(20px) saturate(1.4)" }}
        >
          {/* Search input */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchRef}
              className="w-full rounded-xl border border-white/12 bg-white/[0.05] py-3 pl-11 pr-24 text-sm text-white placeholder-white/36 outline-none transition-colors focus:border-cyan-400/50 focus:bg-white/[0.07]"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveDivision(null);
              }}
              placeholder="Search teams by name, number, location, or school…"
              type="text"
              value={searchQuery}
            />
            {/* Right side: match count + clear */}
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {searchQuery && (
                <>
                  <span className="text-xs tabular-nums text-white/44">
                    {totalMatches} {totalMatches === 1 ? "match" : "matches"}
                  </span>
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/8 text-white/50 transition hover:bg-white/14 hover:text-white/80"
                    onClick={clearSearch}
                    type="button"
                  >
                    <XIcon />
                  </button>
                </>
              )}
              {!searchQuery && (
                <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-white/30 sm:inline-block">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Division filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-all",
                activeDivision === null
                  ? "bg-cyan-400/16 text-cyan-300 border border-cyan-400/30"
                  : "bg-white/[0.04] text-white/50 border border-white/8 hover:bg-white/8 hover:text-white/70",
              )}
              onClick={() => {
                setActiveDivision(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              type="button"
            >
              All · {teams.length}
            </button>
            {filteredTeamsByDivision.map(({ division, filteredTeams }) => {
              const count = divisionCounts[division.code] ?? 0;
              const isFull = count >= seasonConfig.teamsPerDivision;
              const isActive = activeDivision === division.code;
              const matchCount = searchQuery ? filteredTeams.length : undefined;

              return (
                <button
                  className={cn(
                    "group relative shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-all",
                    isActive
                      ? "bg-cyan-400/16 text-cyan-300 border border-cyan-400/30"
                      : "bg-white/[0.04] text-white/50 border border-white/8 hover:bg-white/8 hover:text-white/70",
                  )}
                  key={division.code}
                  onClick={() => scrollToDivision(division.code)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    {division.name}
                    <span
                      className={cn(
                        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                        isFull
                          ? "bg-emerald-400/20 text-emerald-300"
                          : count > 0
                            ? "bg-amber-400/20 text-amber-300"
                            : "bg-white/8 text-white/40",
                      )}
                    >
                      {count}/{seasonConfig.teamsPerDivision}
                    </span>
                    {matchCount !== undefined && matchCount !== filteredTeamsByDivision.find(d => d.division.code === division.code)?.teams.length && (
                      <span className="text-[10px] text-white/30">
                        ({matchCount})
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected teams summary bar */}
          <div className="flex items-center justify-between border-t border-white/8 pt-2.5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  selected.length === seasonConfig.rosterPickCount
                    ? "text-emerald-300"
                    : "text-white/70",
                )}
              >
                {selected.length}/{seasonConfig.rosterPickCount}
              </span>
              <span className="text-xs text-white/40">teams drafted</span>
            </div>
            {selected.length > 0 && !isLocked && (
              <button
                className="text-xs text-white/40 underline decoration-white/16 underline-offset-2 transition hover:text-white/60"
                onClick={() => {
                  setSelected([]);
                  setChampionPick(null);
                }}
                type="button"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* ============================================= */}
        {/*  DIVISION SECTIONS                            */}
        {/* ============================================= */}
        {filteredTeamsByDivision.map(({ division, teams: _allDivTeams, filteredTeams }) => {
          const divisionCount = divisionCounts[division.code] ?? 0;
          const hasHiddenTeams = searchQuery && filteredTeams.length < _allDivTeams.length;
          const showDivision = !searchQuery || filteredTeams.length > 0;

          if (!showDivision) return null;

          return (
            <section
              className="scroll-mt-56 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition-all"
              key={division.code}
              ref={(el) => { divisionRefs.current[division.code] = el; }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{division.name}</h2>
                  <p className="text-sm text-white/56">
                    Pick {seasonConfig.teamsPerDivision} teams from this group.
                    {hasHiddenTeams && (
                      <span className="ml-2 text-cyan-300/70">
                        Showing {filteredTeams.length} of {_allDivTeams.length} teams
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition-colors",
                    divisionCount >= seasonConfig.teamsPerDivision
                      ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-300"
                      : divisionCount > 0
                        ? "border-amber-400/24 bg-amber-400/10 text-amber-300"
                        : "border-white/12 bg-white/6 text-white/70",
                  )}
                >
                  {divisionCount}/{seasonConfig.teamsPerDivision}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredTeams.map((team) => {
                  const checked = selectedSet.has(team.teamNumber);
                  const disableUnchecked =
                    !checked && divisionCount >= seasonConfig.teamsPerDivision;

                  return (
                    <label
                      className={cn(
                        "block cursor-pointer rounded-2xl border p-4 transition-all",
                        checked
                          ? "border-cyan-300/55 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.06)]"
                          : "border-white/10 bg-slate-950/55 hover:border-white/22 hover:bg-slate-900/40",
                        disableUnchecked && "cursor-not-allowed opacity-45",
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
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white">{formatTeamLabel(team)}</p>
                          <p className="mt-1 truncate text-sm text-white/72">{team.nameFull ?? team.schoolName}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/44">
                            {formatLocation(team)}
                          </p>
                        </div>
                        <div className={cn(
                          "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          checked
                            ? "border-cyan-300/40 bg-cyan-400/16 text-cyan-200"
                            : "border-white/12 bg-white/8 text-white/76",
                        )}>
                          #{team.teamNumber}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Show a note when all teams in a division are filtered out by search */}
              {filteredTeams.length === 0 && searchQuery && (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-6 text-center text-sm text-white/40">
                  No teams in {division.name} match &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </section>
          );
        })}

        {/* No results across all divisions */}
        {searchQuery && totalMatches === 0 && (
          <div className="rounded-[24px] border border-dashed border-white/12 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white/60">No teams found</p>
            <p className="mt-2 text-sm text-white/36">
              Try a different search term — team number, name, city, or state.
            </p>
            <button
              className="mt-4 rounded-xl bg-white/8 px-4 py-2 text-sm text-white/60 transition hover:bg-white/12 hover:text-white/80"
              onClick={clearSearch}
              type="button"
            >
              Clear search
            </button>
          </div>
        )}

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold text-white">Save roster</h2>
          <p className="mt-2 text-sm text-white/62">
            Final validation still happens on the server. This screen just keeps the draft playable.
          </p>

          {/* Checklist of remaining steps */}
          {!isLocked && missingSteps.length > 0 && (
            <div className="mt-4 space-y-1.5 rounded-2xl border border-amber-300/16 bg-amber-300/[0.04] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/70">Before you can save</p>
              {missingSteps.map((step) => (
                <p className="flex items-center gap-2 text-sm text-amber-100/80" key={step}>
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                  {step}
                </p>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton
              className={cn(
                "w-full justify-center sm:w-auto",
                !canSave && "!cursor-not-allowed !opacity-40 !bg-white/10 !text-white/40 !border-white/10 hover:!scale-100",
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

      <aside className="sticky top-4 h-fit space-y-4 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(6,10,21,0.96),rgba(8,14,31,0.96))] p-5">
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
