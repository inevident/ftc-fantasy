"use client";

import { useActionState } from "react";

import { createLeagueAction, joinLeagueAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const initialState = { status: "idle" as const };

export function CreateLeagueForm() {
  const [state, action] = useActionState(createLeagueAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm text-white/72">League name</span>
        <input
          className="w-full rounded-2xl border border-white/14 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
          name="name"
          placeholder="Northeast Notebook League"
          required
        />
      </label>
      <SubmitButton idleLabel="Create league" pendingLabel="Creating league" />
      {state.message ? <p className="text-sm text-amber-200">{state.message}</p> : null}
    </form>
  );
}

export function JoinLeagueForm() {
  const [state, action] = useActionState(joinLeagueAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm text-white/72">Invite code</span>
        <input
          className="w-full rounded-2xl border border-white/14 bg-white/6 px-4 py-3 uppercase tracking-[0.2em] text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
          maxLength={8}
          name="inviteCode"
          placeholder="AB12CD34"
          required
        />
      </label>
      <SubmitButton idleLabel="Join league" pendingLabel="Joining league" />
      {state.message ? <p className="text-sm text-amber-200">{state.message}</p> : null}
    </form>
  );
}

